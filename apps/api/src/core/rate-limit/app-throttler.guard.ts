import { Injectable } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// API_RULES §15: every 429 carries a plain `Retry-After` header (seconds), in addition
// to the per-throttler `Retry-After-<name>` header the base guard already sets — the
// plain header is what the HTTP spec (and most off-the-shelf HTTP clients) actually read.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<{ header: (name: string, value: string) => void }>();
    response.header('Retry-After', String(throttlerLimitDetail.timeToBlockExpire));
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
