import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

export interface ReportDateRange {
  createdAfter?: Date;
  createdBefore?: Date;
  branchId?: string;
}

// Reports is a cross-cutting reader over Booking + Invoice + Payment (MASTER.md §6 module
// #13) — it doesn't own an aggregate root of its own, so unlike other repositories it
// doesn't extend BaseRepository<T>. Tenant scope still comes only from TenantContextService
// (CODING_STANDARDS §4: never a caller-supplied parameter), matching every other
// repository's isolation guarantee even though the shape here is bespoke aggregation.
@Injectable()
export class ReportsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // Invoices issued within the given range, tenant-scoped, with their Booking (for branch
  // filtering/reference) and Payments (so sales/outstanding can be derived without a
  // second round trip per invoice).
  findInvoicesInRange(range: ReportDateRange) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        issuedAt: {
          gte: range.createdAfter,
          lte: range.createdBefore,
        },
        ...(range.branchId ? { booking: { branchId: range.branchId } } : {}),
      },
      include: {
        booking: { select: { id: true, bookingReference: true, branchId: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { issuedAt: 'asc' },
    });
  }

  // Bookings created within the given range, tenant-scoped, with the agent (User) who
  // created each one — the basis for the Agent Performance report.
  findBookingsInRange(range: ReportDateRange) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.booking.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: range.createdAfter,
          lte: range.createdBefore,
        },
        ...(range.branchId ? { branchId: range.branchId } : {}),
      },
      include: {
        agent: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
