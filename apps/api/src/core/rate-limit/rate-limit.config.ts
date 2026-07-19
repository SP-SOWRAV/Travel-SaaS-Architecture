import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { TenantContextService } from '../tenant/tenant-context.service';

const ONE_MINUTE_MS = 60_000;
const LOGIN_PATH = '/api/v1/auth/login';

interface RequestWithBody {
  ip: string;
  path?: string;
  originalUrl?: string;
  body?: { email?: string };
}

function asRequest(req: Record<string, unknown>): RequestWithBody {
  return req as unknown as RequestWithBody;
}

// API_RULES §15: two independent limits run on every request — per-IP and per-Agency —
// and whichever is hit first wins (ThrottlerGuard evaluates every named throttler in
// canActivate() and throws on the first one that's over limit). Login gets a third,
// stricter limit on top of both, keyed by IP+email to blunt credential stuffing without
// locking out an entire office IP over one attacker's guesses at a different email.
export function buildThrottlerConfig(tenantContext: TenantContextService): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'ip',
        ttl: ONE_MINUTE_MS,
        limit: 120,
        getTracker: async (req: Record<string, unknown>) => asRequest(req).ip,
      },
      {
        name: 'tenant',
        ttl: ONE_MINUTE_MS,
        limit: 300,
        skipIf: () => !tenantContext.getTenantId(),
        getTracker: async () => tenantContext.requireTenantId(),
      },
      {
        name: 'login',
        ttl: ONE_MINUTE_MS,
        limit: 5,
        skipIf: (context) => {
          const req = asRequest(context.switchToHttp().getRequest());
          return (req.path ?? req.originalUrl) !== LOGIN_PATH;
        },
        getTracker: async (req: Record<string, unknown>) => {
          const { ip, body } = asRequest(req);
          return `${ip}:${(body?.email ?? '').toLowerCase()}`;
        },
      },
    ],
  };
}
