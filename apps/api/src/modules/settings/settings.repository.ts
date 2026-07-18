import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

@Injectable()
export class SettingsRepository extends BaseRepository<Prisma.SettingsDelegate> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma.settings, tenantContext);
  }

  findForCurrentTenant() {
    return this.findFirst();
  }

  async updateForCurrentTenant(data: Prisma.SettingsUpdateInput) {
    const existing = await this.findFirst();
    if (!existing) {
      throw new NotFoundException('Settings not found');
    }
    return this.update((existing as { id: string }).id, data as Record<string, unknown>);
  }
}
