import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { TenantContextService } from '../tenant/tenant-context.service';

interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown;
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
};

function isStructuredBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'code' in body && 'message' in body;
}

// The single place every thrown exception becomes the API_RULES §7 error envelope
// (CODING_STANDARDS §14) — no Controller ever hand-builds an error response. Exceptions
// that already carry a structured { code, message, details } body (the global
// ValidationPipe's exceptionFactory in main.ts, InvalidWorkflowTransitionException) pass
// straight through; every other HttpException (NotFoundException('Booking not found'),
// etc. — the vast majority of throw sites across every module) is normalized from just
// its HTTP status, with zero changes required at any of those existing throw sites.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly tenantContext: TenantContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (isStructuredBody(body)) {
        response.status(status).json({ error: body });
        return;
      }

      const code = STATUS_CODE_MAP[status] ?? 'ERROR';
      const rawMessage = typeof body === 'string' ? body : (body as { message?: string | string[] })?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : (rawMessage ?? exception.message);

      response.status(status).json({ error: { code, message, details: null } });
      return;
    }

    // Unexpected/unhandled fault — full detail goes to server-side logs only, never to
    // the client (API_RULES §21). Logged as the same structured shape as
    // RequestLoggingMiddleware's per-request line (HIGH-10) so it correlates by requestId.
    const context = this.tenantContext.getContext();
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        requestId: response.getHeader('x-request-id') ?? null,
        tenantId: context.tenantId ?? null,
        userId: context.userId ?? null,
        message: exception instanceof Error ? exception.message : 'Unhandled exception',
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    );
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: null },
    });
  }
}
