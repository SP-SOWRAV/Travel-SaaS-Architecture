import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { TenantContextService } from '../tenant/tenant-context.service';
import { IdempotencyService } from './idempotency.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';

// API_RULES §16 — applied via @UseInterceptors on exactly the Workflow Engine action
// endpoints (reserve/issue-ticket/cancel) and Finance mutations (invoice/payments/
// refunds) it names, not globally. The header is optional at the transport level (an
// existing caller that never sends one still works exactly as before); when present, a
// retried request with the same key returns the original response instead of
// re-executing the underlying action.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly tenantContext: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.header(IDEMPOTENCY_HEADER);
    if (!key) {
      return next.handle();
    }

    const tenantId = this.tenantContext.requireTenantId();
    const response = context.switchToHttp().getResponse<Response>();

    return from(this.idempotencyService.find(tenantId, key)).pipe(
      switchMap((cached) => {
        if (cached) {
          response.status(cached.statusCode);
          return of(cached.responseBody);
        }

        return next.handle().pipe(
          tap((body) => {
            // Round-trip through JSON.stringify/parse before storing — the raw return
            // value can still contain Prisma Decimal instances (their special toJSON()
            // is what makes API_RULES §19 money fields serialize as strings); storing
            // the object as-is into the JSONB column skipped that conversion, so a
            // replayed response came back with money fields as JSON numbers instead of
            // the strings a real HTTP response would have sent.
            const normalized = JSON.parse(JSON.stringify(body));
            this.idempotencyService
              .store(tenantId, key, response.statusCode, normalized)
              .catch((err) => console.error('IdempotencyInterceptor: failed to store response', err));
          }),
        );
      }),
    );
  }
}
