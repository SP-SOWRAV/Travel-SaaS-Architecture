import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

export interface CreateRefundInput {
  invoiceId: string;
  paymentId?: string;
  amount: number;
  currencyCode: string;
  reason: string;
  processedBy: string;
}

@Injectable()
export class RefundRepository extends BaseRepository<Prisma.RefundDelegate> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCtx: TenantContextService,
  ) {
    super(prisma.refund, tenantCtx);
  }

  // DATABASE.md §9/§3.20: every refund produces exactly one Transaction row (signed
  // negative), written inside the same DB transaction as the Refund it logs.
  async createWithTransaction(input: CreateRefundInput) {
    const tenantId = this.tenantCtx.requireTenantId();

    const refundId = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          tenantId,
          invoiceId: input.invoiceId,
          paymentId: input.paymentId,
          amount: input.amount,
          currencyCode: input.currencyCode,
          reason: input.reason,
          processedBy: input.processedBy,
        },
      });

      await tx.transaction.create({
        data: {
          tenantId,
          type: 'refund',
          referenceTable: 'refunds',
          referenceId: refund.id,
          amount: -input.amount,
          currencyCode: input.currencyCode,
          createdBy: input.processedBy,
        },
      });

      return refund.id;
    });

    return this.findById(refundId);
  }

  findByInvoiceId(invoiceId: string) {
    return this.delegate.findMany({
      where: { invoiceId, tenantId: this.tenantCtx.requireTenantId() },
      orderBy: { refundedAt: 'asc' },
    });
  }

  findPaymentInInvoice(invoiceId: string, paymentId: string) {
    return this.prisma.payment.findFirst({
      where: { id: paymentId, invoiceId, tenantId: this.tenantCtx.requireTenantId() },
    });
  }
}
