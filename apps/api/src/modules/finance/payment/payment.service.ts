import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { WorkflowStage } from '@project/shared-types';
import { BookingRepository } from '../../flight-booking/booking/booking.repository';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { WorkflowEngineService } from '../../../workflow-engine/workflow-engine.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentRepository } from './payment.repository';

interface InvoiceRecord {
  status: string;
  totalAmount: unknown;
  currencyCode: string;
  bookingId: string;
}

function generateReceiptNumber(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RCPT-${Date.now().toString(36).toUpperCase()}${random}`;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once,
// including on the nested Receipt sub-entity (also carries its own tenant_id column).
function toPaymentResponse(payment: Record<string, unknown>) {
  const { tenantId, receipt, ...rest } = payment;
  const mappedReceipt =
    receipt && typeof receipt === 'object'
      ? (() => {
          const { tenantId: receiptTenantId, ...receiptRest } = receipt as Record<string, unknown>;
          return { ...receiptRest, agencyId: receiptTenantId };
        })()
      : receipt;
  return { ...rest, agencyId: tenantId, receipt: mappedReceipt };
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly tenantContext: TenantContextService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  // T42: records a Payment + Receipt, then updates the Invoice's own document-level
  // status and drives the booking's lifecycle: any payment while still Invoiced moves
  // the booking to Paid; full settlement additionally advances Paid -> Completed in the
  // same call (Acceptance Criteria: "moves the booking through Paid to Completed").
  // H2 hardening: the Payment/Receipt/Transaction row, the Invoice status update, and the
  // Workflow Engine's booking-status update(s) now all commit as one Prisma transaction
  // (CODING_STANDARDS §5) — previously these were separate statements, so a crash between
  // them could leave a payment recorded but the invoice/booking still showing unpaid.
  async recordPayment(invoiceId: string, dto: CreatePaymentDto) {
    const invoice = (await this.invoiceRepository.findById(invoiceId)) as InvoiceRecord | null;
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'void') {
      throw new ConflictException('Cannot record a payment against a void invoice');
    }

    const existingPayments = (await this.paymentRepository.findByInvoiceId(invoiceId)) as { amount: unknown }[];
    const alreadyPaid = existingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalAmount = Number(invoice.totalAmount);
    const remaining = totalAmount - alreadyPaid;

    if (dto.amount > remaining + 0.001) {
      throw new UnprocessableEntityException(
        `Payment of ${dto.amount.toFixed(2)} exceeds the outstanding balance of ${remaining.toFixed(2)}`,
      );
    }

    const actorId = this.tenantContext.requireUserId();
    const fullyPaid = alreadyPaid + dto.amount >= totalAmount - 0.001;

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await this.paymentRepository.createWithReceipt(
        {
          invoiceId,
          amount: dto.amount,
          currencyCode: invoice.currencyCode,
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          receivedBy: actorId,
          receiptNumber: generateReceiptNumber(),
        },
        tx,
      );

      await this.invoiceRepository.updateStatus(invoiceId, fullyPaid ? 'paid' : 'partially_paid', tx);

      const booking = (await this.bookingRepository.findByIdInTransaction(invoice.bookingId, tx)) as {
        status: string;
      } | null;
      if (booking?.status === WorkflowStage.Invoiced) {
        await this.workflowEngine.transition(invoice.bookingId, WorkflowStage.Paid, actorId, dto.reason, tx);
      }
      if (fullyPaid) {
        await this.workflowEngine.transition(invoice.bookingId, WorkflowStage.Completed, actorId, dto.reason, tx);
      }

      return created;
    });

    return toPaymentResponse(payment as unknown as Record<string, unknown>);
  }

  async getById(id: string) {
    const payment = await this.paymentRepository.findWithReceipt(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return toPaymentResponse(payment as unknown as Record<string, unknown>);
  }

  async listByInvoice(invoiceId: string) {
    const payments = (await this.paymentRepository.findByInvoiceId(invoiceId)) as Record<string, unknown>[];
    return payments.map(toPaymentResponse);
  }
}
