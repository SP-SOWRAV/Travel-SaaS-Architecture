import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

// The MVP's unified financial log (MASTER.md §7, DATABASE.md §3.20) — immutable, append-only.
// Rows are written by PaymentRepository/RefundRepository directly (inside the same DB
// transaction as their own Payment/Refund row, DATABASE.md §9) rather than through this
// repository's `create`, since that write must be atomic with its originating row. This
// repository exists for the read side: standalone lookups and, later, Reports aggregation.
@Injectable()
export class TransactionRepository extends BaseRepository<Prisma.TransactionDelegate> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma.transaction, tenantContext);
  }
}
