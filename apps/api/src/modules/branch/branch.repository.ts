import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

@Injectable()
export class BranchRepository extends BaseRepository<Prisma.BranchDelegate> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma.branch, tenantContext, true);
  }
}
