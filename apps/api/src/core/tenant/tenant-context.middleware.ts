import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';

interface DecodedTokenPayload {
  tenantId?: string;
  userId?: string;
  role?: string;
}

// Payload is read without signature verification: the JwtAuthGuard (T12) verifies and
// rejects invalid/expired tokens downstream, after this middleware has already run. This
// middleware only seeds request-scoped tenant context for the base repository (API_RULES §20).
function decodeBearerPayload(authHeader: string | undefined): DecodedTokenPayload {
  if (!authHeader?.startsWith('Bearer ')) {
    return {};
  }

  const payloadSegment = authHeader.slice('Bearer '.length).split('.')[1];
  if (!payloadSegment) {
    return {};
  }

  try {
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    return JSON.parse(json) as DecodedTokenPayload;
  } catch {
    return {};
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { tenantId, userId, role } = decodeBearerPayload(req.headers.authorization);
    this.tenantContext.run({ tenantId, userId, role }, () => next());
  }
}
