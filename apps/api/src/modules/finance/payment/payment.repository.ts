import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;
  currencyCode: string;
  paymentMethod: string;
  reference?: string;
  receivedBy: string;
  receiptNumber: string;
}

// Owns Payment and its direct 1:1 sub-entity Receipt as one aggregate (CODING_STANDARDS
// §4) — a Receipt is always created together with its Payment and never independently.
@Injectable()
export class PaymentRepository extends BaseRepository<Prisma.PaymentDelegate> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCtx: TenantContextService,
  ) {
    super(prisma.payment, tenantCtx);
  }

  async createWithReceipt(input: CreatePaymentInput) {
    const tenantId = this.tenantCtx.requireTenantId();

    const paymentId = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId: input.invoiceId,
          amount: input.amount,
          currencyCode: input.currencyCode,
          paymentMethod: input.paymentMethod as Prisma.PaymentUncheckedCreateInput['paymentMethod'],
          reference: input.reference,
          receivedBy: input.receivedBy,
        },
      });

      await tx.receipt.create({
        data: {
          tenantId,
          paymentId: payment.id,
          receiptNumber: input.receiptNumber,
        },
      });

      return payment.id;
    });

    return this.findWithReceipt(paymentId);
  }

  findWithReceipt(id: string) {
    return this.delegate.findFirst({
      where: { id, tenantId: this.tenantCtx.requireTenantId() },
      include: { receipt: true },
    });
  }

  findByInvoiceId(invoiceId: string) {
    return this.delegate.findMany({
      where: { invoiceId, tenantId: this.tenantCtx.requireTenantId() },
      orderBy: { paidAt: 'asc' },
    });
  }

  findReceiptById(receiptId: string) {
    return this.prisma.receipt.findFirst({
      where: { id: receiptId, tenantId: this.tenantCtx.requireTenantId() },
      include: { payment: true },
    });
  }
}
