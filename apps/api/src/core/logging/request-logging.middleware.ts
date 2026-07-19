import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from '../tenant/tenant-context.service';

// HIGH-10 hardening: one structured JSON line per request, correlated by requestId and
// tenantId — the only prior logging was ad-hoc console.error calls with no shared shape
// and nothing to tie a line back to the request that produced it. Runs after
// TenantContextMiddleware (registered second in app.module.ts) so it executes inside that
// middleware's AsyncLocalStorage.run() scope — tenantContext.getContext() is readable here,
// including inside the res.on('finish') callback below, since Node's AsyncLocalStorage
// propagates to callbacks registered synchronously within the run() scope.
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.header('x-request-id') || randomUUID();
    res.setHeader('x-request-id', requestId);
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const context = this.tenantContext.getContext();
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs),
          tenantId: context.tenantId ?? null,
          userId: context.userId ?? null,
        }),
      );
    });

    next();
  }
}
