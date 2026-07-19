import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidWorkflowTransition, WorkflowStage } from '@project/shared-types';
import { BookingRepository } from '../../flight-booking/booking/booking.repository';
import { SettingsService } from '../../settings/settings.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { WorkflowEngineService } from '../../../workflow-engine/workflow-engine.service';
import { CreateInvoiceLineInput, InvoiceRepository } from './invoice.repository';

interface FareWithTaxes {
  passengerId: string;
  sectorId: string;
  baseAmount: unknown;
  taxes: { taxCode: string; description: string | null; amount: unknown }[];
}

interface BookingWithRelations {
  currencyCode: string;
  passengers: { id: string; firstName: string; lastName: string }[];
  sectors: { id: string; flightNumber: string }[];
  fares: FareWithTaxes[];
}

function generateInvoiceNumber(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${Date.now().toString(36).toUpperCase()}${random}`;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toInvoiceResponse(invoice: Record<string, unknown>) {
  const { tenantId, ...rest } = invoice;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly settingsService: SettingsService,
    private readonly tenantContext: TenantContextService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  // T41: builds Invoice + InvoiceLine from the booking's own Fares/Taxes (the workflow
  // engine's TicketIssued -> Invoiced adjacency check, T38, is what actually enforces the
  // booking is in the right stage — a redundant status check here would be a parallel
  // status check the Workflow Engine already owns, MASTER.md §13 rule 2).
  async generateFromBooking(bookingId: string, reason?: string) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Fail fast on an invalid transition *before* writing anything (the same adjacency
    // check WorkflowEngineService.transition performs below) — otherwise a rejected
    // transition would still leave an orphan Invoice row behind, permanently blocked by
    // the duplicate-invoice guard just below with no way to retry.
    const currentStage = (booking as { status: string }).status as unknown as WorkflowStage;
    if (!isValidWorkflowTransition(currentStage, WorkflowStage.Invoiced)) {
      throw new ConflictException(
        `Invalid workflow transition: '${currentStage}' -> '${WorkflowStage.Invoiced}' is not allowed`,
      );
    }

    const existing = await this.invoiceRepository.findByBookingId(bookingId);
    if (existing) {
      throw new ConflictException('An invoice already exists for this booking');
    }

    const withRelations = (await this.bookingRepository.findBookingWithRelations(
      bookingId,
    )) as unknown as BookingWithRelations;

    const settings = await this.settingsService.getSettings();

    const lines: CreateInvoiceLineInput[] = [];
    let subtotalAmount = 0;
    let taxAmount = 0;
    let sortOrder = 0;

    for (const fare of withRelations.fares) {
      const passenger = withRelations.passengers.find((p) => p.id === fare.passengerId);
      const sector = withRelations.sectors.find((s) => s.id === fare.sectorId);
      const passengerLabel = passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Passenger';
      const sectorLabel = sector ? sector.flightNumber : 'Sector';
      const baseAmount = Number(fare.baseAmount);

      lines.push({
        description: `Fare - ${passengerLabel} - ${sectorLabel}`,
        quantity: 1,
        unitAmount: baseAmount,
        lineTotal: baseAmount,
        sortOrder: sortOrder++,
      });
      subtotalAmount += baseAmount;

      for (const tax of fare.taxes) {
        const amount = Number(tax.amount);
        lines.push({
          description: tax.description ? `Tax (${tax.taxCode}) - ${tax.description}` : `Tax (${tax.taxCode})`,
          quantity: 1,
          unitAmount: amount,
          lineTotal: amount,
          sortOrder: sortOrder++,
        });
        taxAmount += amount;
      }
    }

    const totalAmount = subtotalAmount + taxAmount;
    const invoiceNumber = generateInvoiceNumber(settings.invoicePrefix);

    const invoice = await this.invoiceRepository.createWithLines({
      bookingId,
      invoiceNumber,
      currencyCode: withRelations.currencyCode,
      subtotalAmount,
      taxAmount,
      totalAmount,
      lines,
    });

    const actorId = this.tenantContext.requireUserId();
    await this.workflowEngine.transition(bookingId, WorkflowStage.Invoiced, actorId, reason);

    return toInvoiceResponse(invoice as unknown as Record<string, unknown>);
  }

  async getById(id: string) {
    const invoice = await this.invoiceRepository.findWithLines(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return toInvoiceResponse(invoice as unknown as Record<string, unknown>);
  }

  async list(status?: string, bookingId?: string) {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (bookingId) {
      where.bookingId = bookingId;
    }
    const invoices = (await this.invoiceRepository.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })) as Record<string, unknown>[];
    return invoices.map(toInvoiceResponse);
  }
}
