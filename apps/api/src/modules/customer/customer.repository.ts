import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

@Injectable()
export class CustomerRepository extends BaseRepository<Prisma.CustomerDelegate> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma.customer, tenantContext, true);
  }
}
