import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { isValidWorkflowTransition, WorkflowStage } from '@project/shared-types';
import { BookingRepository } from '../../flight-booking/booking/booking.repository';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { PaymentRepository } from '../payment/payment.repository';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { WorkflowEngineService } from '../../../workflow-engine/workflow-engine.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundRepository } from './refund.repository';

interface InvoiceRecord {
  bookingId: string;
  currencyCode: string;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toRefundResponse(refund: Record<string, unknown>) {
  const { tenantId, ...rest } = refund;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class RefundService {
  constructor(
    private readonly refundRepository: RefundRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly tenantContext: TenantContextService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  // T43: refund only permitted from a post-payment booking stage (Paid/Completed,
  // MASTER.md §5) — checked *before* writing anything (the same lesson learned in T41:
  // an orphan Refund row left behind by a rejected transition would be unrecoverable).
  async processRefund(invoiceId: string, dto: CreateRefundDto) {
    const invoice = (await this.invoiceRepository.findById(invoiceId)) as InvoiceRecord | null;
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const booking = (await this.bookingRepository.findById(invoice.bookingId)) as { status: string } | null;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const currentStage = booking.status as unknown as WorkflowStage;
    if (!isValidWorkflowTransition(currentStage, WorkflowStage.Refunded)) {
      throw new ConflictException(
        `Invalid workflow transition: '${currentStage}' -> '${WorkflowStage.Refunded}' is not allowed`,
      );
    }

    if (dto.paymentId) {
      const payment = await this.refundRepository.findPaymentInInvoice(invoiceId, dto.paymentId);
      if (!payment) {
        throw new UnprocessableEntityException('paymentId must reference an existing payment on this invoice');
      }
    }

    const payments = (await this.paymentRepository.findByInvoiceId(invoiceId)) as { amount: unknown }[];
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const existingRefunds = (await this.refundRepository.findByInvoiceId(invoiceId)) as { amount: unknown }[];
    const totalRefunded = existingRefunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    const availableToRefund = totalPaid - totalRefunded;

    if (dto.amount > availableToRefund + 0.001) {
      throw new UnprocessableEntityException(
        `Refund of ${dto.amount.toFixed(2)} exceeds the amount available to refund (${availableToRefund.toFixed(2)})`,
      );
    }

    const actorId = this.tenantContext.requireUserId();
    const refund = await this.refundRepository.createWithTransaction({
      invoiceId,
      paymentId: dto.paymentId,
      amount: dto.amount,
      currencyCode: invoice.currencyCode,
      reason: dto.reason,
      processedBy: actorId,
    });

    await this.workflowEngine.transition(invoice.bookingId, WorkflowStage.Refunded, actorId, dto.reason);

    return toRefundResponse(refund as unknown as Record<string, unknown>);
  }

  async getById(id: string) {
    const refund = await this.refundRepository.findById(id);
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return toRefundResponse(refund as unknown as Record<string, unknown>);
  }

  async listByInvoice(invoiceId: string) {
    const refunds = (await this.refundRepository.findByInvoiceId(invoiceId)) as Record<string, unknown>[];
    return refunds.map(toRefundResponse);
  }
}
