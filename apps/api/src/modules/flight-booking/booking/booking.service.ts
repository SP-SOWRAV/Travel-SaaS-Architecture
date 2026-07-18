import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BranchService } from '../../branch/branch.service';
import { CustomerService } from '../../customer/customer.service';
import { SettingsService } from '../../settings/settings.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
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
  ) {}

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
}
