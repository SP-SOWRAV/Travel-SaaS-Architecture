import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

type PrismaTransactionClient = Prisma.TransactionClient;

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

  // H2 hardening: accepts the caller's transaction client so Payment+Receipt+Transaction
  // creation commits atomically with the Invoice status update and the Workflow Engine's
  // booking-status update that always accompany a payment (PaymentService.recordPayment) —
  // previously only this inner create was atomic; the invoice/booking updates were
  // separate, independently-committing statements. Falls back to opening its own
  // transaction for a standalone call.
  async createWithReceipt(input: CreatePaymentInput, tx?: PrismaTransactionClient) {
    const tenantId = this.tenantCtx.requireTenantId();

    const create = async (client: PrismaTransactionClient) => {
      const payment = await client.payment.create({
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

      await client.receipt.create({
        data: {
          tenantId,
          paymentId: payment.id,
          receiptNumber: input.receiptNumber,
        },
      });

      // DATABASE.md §9/§3.20: every payment produces exactly one Transaction row, written
      // inside the same DB transaction as the Payment it logs — signed positive for a
      // payment (negative is reserved for Refund, RefundRepository.createWithTransaction).
      await client.transaction.create({
        data: {
          tenantId,
          type: 'payment',
          referenceTable: 'payments',
          referenceId: payment.id,
          amount: input.amount,
          currencyCode: input.currencyCode,
          createdBy: input.receivedBy,
        },
      });

      return payment.id;
    };

    const paymentId = tx ? await create(tx) : await this.prisma.$transaction(create);
    const readClient = tx ?? this.prisma;
    return readClient.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { receipt: true },
    });
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
      include: { receipt: true },
    });
  }

  findReceiptById(receiptId: string) {
    return this.prisma.receipt.findFirst({
      where: { id: receiptId, tenantId: this.tenantCtx.requireTenantId() },
      include: { payment: true },
    });
  }
}
