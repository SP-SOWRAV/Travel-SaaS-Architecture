import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId?: string;
  userId?: string;
  role?: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): TenantContext {
    return this.storage.getStore() ?? {};
  }

  getTenantId(): string | undefined {
    return this.getContext().tenantId;
  }

  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('Tenant context is not established for this request');
    }
    return tenantId;
  }

  getUserId(): string | undefined {
    return this.getContext().userId;
  }

  requireUserId(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('User context is not established for this request');
    }
    return userId;
  }

  getRole(): string | undefined {
    return this.getContext().role;
  }
}
