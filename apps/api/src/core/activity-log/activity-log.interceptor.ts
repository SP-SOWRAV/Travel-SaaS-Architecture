import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { TenantContextService } from '../tenant/tenant-context.service';
import { ActivityLogService } from './activity-log.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toSnakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function deriveEntityType(controllerName: string): string {
  return toSnakeCase(controllerName.replace(/Controller$/, ''));
}

// Global interceptor (registered once in AppModule per TASKS.md T49) — records every
// successful mutating request across every existing and future module without any
// per-controller annotation: Controller class name -> entity_type, handler method name
// -> the action verb (`${entityType}.${handlerName}`). This convention is exactly why
// T49's own footprint touches no existing controller file (CODING_STANDARDS §10: global
// concerns registered once, never duplicated per module) — Booking's reserve/cancel/
// issueTicket, Invoice's generate, Payment's record, and Refund's process are all picked
// up automatically as "status transitions" and "payments" per the task's own wording.
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly tenantContext: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    const entityType = deriveEntityType(context.getClass().name);
    const action = `${entityType}.${context.getHandler().name}`;

    return next.handle().pipe(
      tap((responseBody) => {
        const entityId = this.resolveEntityId(responseBody, request);
        if (!entityId) {
          return;
        }

        // Never let audit-logging failure affect the business response, which by this
        // point has already been computed (and, for a GET, already sent to the client).
        this.activityLogService
          .record({
            tenantId: this.tenantContext.getTenantId() ?? null,
            actorId: this.tenantContext.getUserId() ?? null,
            action,
            entityType,
            entityId,
            metadata: this.extractMetadata(responseBody),
            ipAddress: request.ip ?? null,
          })
          .catch((err) => {
            console.error('ActivityLogInterceptor: failed to write activity log', err);
          });
      }),
    );
  }

  private resolveEntityId(responseBody: unknown, request: Request): string | undefined {
    const data = (responseBody as { data?: { id?: unknown } } | undefined)?.data;
    if (data && typeof data.id === 'string' && UUID_RE.test(data.id)) {
      return data.id;
    }
    // Nested-resource DELETE endpoints return 204 with no body — the deepest route param
    // is the target entity's own id in every route in this API (API_RULES §2 nesting).
    const paramValues = Object.values(request.params ?? {});
    const lastParam = paramValues[paramValues.length - 1];
    return typeof lastParam === 'string' && UUID_RE.test(lastParam) ? lastParam : undefined;
  }

  private extractMetadata(responseBody: unknown): unknown {
    return (responseBody as { data?: unknown } | undefined)?.data ?? null;
  }
}
