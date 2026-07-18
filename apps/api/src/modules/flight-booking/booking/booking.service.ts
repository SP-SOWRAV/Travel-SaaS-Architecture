import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkflowStage } from '@project/shared-types';
import { BranchService } from '../../branch/branch.service';
import { CustomerService } from '../../customer/customer.service';
import { SettingsService } from '../../settings/settings.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { WorkflowEngineService } from '../../../workflow-engine/workflow-engine.service';
import { AggregateBookingInput } from './booking.repository';
import { BookingRepository } from './booking.repository';
import { CreateBookingDto } from './dto/create-booking.dto';

function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003';
}

function generateBookingReference(): string {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${Date.now().toString(36).toUpperCase()}${random}`;
}

function generateTicketNumber(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${Date.now().toString(36).toUpperCase()}${random}`;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toBookingAggregateResponse(booking: Record<string, unknown>) {
  const { tenantId, deletedAt: _deletedAt, ...rest } = booking;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly customerService: CustomerService,
    private readonly branchService: BranchService,
    private readonly settingsService: SettingsService,
    private readonly tenantContext: TenantContextService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  private async requireOwnBooking(bookingId: string) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  // API_RULES §5: a body-referenced ID that doesn't belong to this Agency fails as a 422
  // shape/body-validation error, never a 404 resource lookup.
  private async assertCustomerInTenant(customerId: string): Promise<void> {
    try {
      await this.customerService.getById(customerId);
    } catch {
      throw new UnprocessableEntityException('customerId must reference an existing customer in this Agency');
    }
  }

  private async assertBranchInTenant(branchId: string): Promise<void> {
    try {
      await this.branchService.getById(branchId);
    } catch {
      throw new UnprocessableEntityException('branchId must reference an existing branch in this Agency');
    }
  }

  async createAggregate(dto: CreateBookingDto) {
    await this.assertCustomerInTenant(dto.customerId);
    await this.assertBranchInTenant(dto.branchId);

    const settings = await this.settingsService.getSettings();
    const agentId = this.tenantContext.requireUserId();

    const fares = dto.fares ?? [];
    const totalAmount = fares.reduce((sum, fare) => {
      const taxTotal = (fare.taxes ?? []).reduce((taxSum, tax) => taxSum + tax.amount, 0);
      return sum + fare.baseAmount + taxTotal;
    }, 0);

    const input: AggregateBookingInput = {
      bookingReference: generateBookingReference(),
      customerId: dto.customerId,
      branchId: dto.branchId,
      agentId,
      currencyCode: settings.currencyCode,
      totalAmount,
      passengers: dto.passengers as unknown as Record<string, unknown>[],
      sectors: dto.sectors as unknown as Record<string, unknown>[],
      fares: fares.map((fare) => ({
        passengerIndex: fare.passengerIndex,
        sectorIndex: fare.sectorIndex,
        baseAmount: fare.baseAmount,
        taxes: (fare.taxes ?? []).map((tax) => ({
          taxCode: tax.taxCode,
          description: tax.description,
          amount: tax.amount,
        })),
      })),
    };

    try {
      const booking = await this.bookingRepository.createAggregate(input);
      return toBookingAggregateResponse(booking as unknown as Record<string, unknown>);
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_FARE_INDEX_REFERENCE') {
        throw new UnprocessableEntityException(
          'Each fare.passengerIndex/sectorIndex must reference an item in the passengers/sectors arrays',
        );
      }
      if (isForeignKeyViolation(err)) {
        throw new UnprocessableEntityException(
          'One or more sector/fare references (airlineId, originAirportId, destinationAirportId) do not exist',
        );
      }
      throw err;
    }
  }

  async getAggregate(bookingId: string) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const withRelations = await this.bookingRepository.findBookingWithRelations(bookingId);
    return toBookingAggregateResponse(withRelations as unknown as Record<string, unknown>);
  }

  // List view (TASKS.md T35) — summary rows only, no nested passengers/sectors/fares.
  async list(status?: string, branchId?: string) {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (branchId) {
      where.branchId = branchId;
    }
    const bookings = (await this.bookingRepository.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })) as Record<string, unknown>[];
    return bookings.map(toBookingAggregateResponse);
  }

  // T39: real lifecycle endpoints — each delegates to the Workflow Engine (T38) instead of
  // writing `status` directly (MASTER.md §13 rule 2).
  async reserve(bookingId: string, reason?: string) {
    await this.requireOwnBooking(bookingId);
    const actorId = this.tenantContext.requireUserId();
    await this.workflowEngine.transition(bookingId, WorkflowStage.Reserved, actorId, reason);
    return this.getAggregate(bookingId);
  }

  async cancel(bookingId: string, reason: string) {
    await this.requireOwnBooking(bookingId);
    const actorId = this.tenantContext.requireUserId();
    await this.workflowEngine.transition(bookingId, WorkflowStage.Cancelled, actorId, reason);
    return this.getAggregate(bookingId);
  }

  // Populates every passenger's Ticket (T33 placeholder) with a real number, using
  // Settings -> Ticket Prefix (T15), then transitions the booking to Ticket Issued.
  async issueTicket(bookingId: string, reason?: string) {
    await this.requireOwnBooking(bookingId);
    const actorId = this.tenantContext.requireUserId();
    const settings = await this.settingsService.getSettings();

    const passengers = await this.bookingRepository.findPassengers(bookingId);
    const existingTickets = await this.bookingRepository.findTickets(bookingId);

    for (const passenger of passengers as { id: string }[]) {
      const hasTicket = (existingTickets as { passengerId: string }[]).some(
        (ticket) => ticket.passengerId === passenger.id,
      );
      if (!hasTicket) {
        await this.bookingRepository.createTicket(bookingId, passenger.id);
      }
    }

    const tickets = (await this.bookingRepository.findTickets(bookingId)) as {
      id: string;
      ticketNumber: string | null;
    }[];
    for (const ticket of tickets) {
      if (!ticket.ticketNumber) {
        await this.bookingRepository.issueTicket(ticket.id, generateTicketNumber(settings.ticketPrefix));
      }
    }

    await this.workflowEngine.transition(bookingId, WorkflowStage.TicketIssued, actorId, reason);
    return this.getAggregate(bookingId);
  }
}
