import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

export interface AggregateFareInput {
  passengerIndex: number;
  sectorIndex: number;
  baseAmount: number;
  taxes: { taxCode: string; description?: string; amount: number }[];
}

export interface AggregateBookingInput {
  bookingReference: string;
  customerId: string;
  branchId: string;
  agentId: string;
  currencyCode: string;
  totalAmount: number;
  passengers: Record<string, unknown>[];
  sectors: Record<string, unknown>[];
  fares: AggregateFareInput[];
}

// Owns Booking and its direct sub-entities (Passenger, Sector, Fare, Tax, Ticket, Remarks)
// as one aggregate (CODING_STANDARDS §4) — they're always read/written together, and none
// carry their own tenant_id (DATABASE.md §3.8+), so tenant safety flows from verifying the
// parent Booking here (inherited findById) before any sub-entity operation below.
@Injectable()
export class BookingRepository extends BaseRepository<Prisma.BookingDelegate> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCtx: TenantContextService,
  ) {
    super(prisma.booking, tenantCtx, true);
  }

  // T32: creates the Booking plus every nested Passenger/Sector/Fare/Tax in one DB
  // transaction — any failure (bad FK, invalid index reference) throws and Prisma rolls
  // back everything created so far in this call.
  async createAggregate(input: AggregateBookingInput) {
    const tenantId = this.tenantCtx.requireTenantId();

    const bookingId = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          tenantId,
          bookingReference: input.bookingReference,
          customerId: input.customerId,
          branchId: input.branchId,
          agentId: input.agentId,
          currencyCode: input.currencyCode,
          totalAmount: input.totalAmount,
        },
      });

      const passengers = [];
      for (const passengerData of input.passengers) {
        passengers.push(
          await tx.passenger.create({
            data: { ...passengerData, bookingId: booking.id } as Prisma.PassengerUncheckedCreateInput,
          }),
        );
      }

      const sectors = [];
      for (const sectorData of input.sectors) {
        sectors.push(
          await tx.sector.create({
            data: { ...sectorData, bookingId: booking.id } as Prisma.SectorUncheckedCreateInput,
          }),
        );
      }

      for (const fareInput of input.fares) {
        const passenger = passengers[fareInput.passengerIndex];
        const sector = sectors[fareInput.sectorIndex];
        if (!passenger || !sector) {
          throw new Error('INVALID_FARE_INDEX_REFERENCE');
        }
        const fare = await tx.fare.create({
          data: {
            bookingId: booking.id,
            passengerId: passenger.id,
            sectorId: sector.id,
            baseAmount: fareInput.baseAmount,
            currencyCode: input.currencyCode,
          },
        });
        for (const taxInput of fareInput.taxes) {
          await tx.tax.create({
            data: {
              fareId: fare.id,
              taxCode: taxInput.taxCode,
              description: taxInput.description,
              amount: taxInput.amount,
            },
          });
        }
      }

      return booking.id;
    });

    return this.findBookingWithRelations(bookingId);
  }

  findBookingWithRelations(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passengers: true,
        sectors: true,
        fares: { include: { taxes: true } },
      },
    });
  }

  findPassengers(bookingId: string) {
    return this.prisma.passenger.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } });
  }

  findPassengerById(bookingId: string, passengerId: string) {
    return this.prisma.passenger.findFirst({ where: { id: passengerId, bookingId } });
  }

  createPassenger(bookingId: string, data: Record<string, unknown>) {
    return this.prisma.passenger.create({
      data: { ...data, bookingId } as Prisma.PassengerUncheckedCreateInput,
    });
  }

  updatePassenger(passengerId: string, data: Record<string, unknown>) {
    return this.prisma.passenger.update({
      where: { id: passengerId },
      data: data as Prisma.PassengerUpdateInput,
    });
  }

  deletePassenger(passengerId: string) {
    return this.prisma.passenger.delete({ where: { id: passengerId } });
  }

  findSectors(bookingId: string) {
    return this.prisma.sector.findMany({
      where: { bookingId },
      orderBy: { sequenceNumber: 'asc' },
    });
  }

  findSectorById(bookingId: string, sectorId: string) {
    return this.prisma.sector.findFirst({ where: { id: sectorId, bookingId } });
  }

  createSector(bookingId: string, data: Record<string, unknown>) {
    return this.prisma.sector.create({
      data: { ...data, bookingId } as Prisma.SectorUncheckedCreateInput,
    });
  }

  updateSector(sectorId: string, data: Record<string, unknown>) {
    return this.prisma.sector.update({
      where: { id: sectorId },
      data: data as Prisma.SectorUpdateInput,
    });
  }

  deleteSector(sectorId: string) {
    return this.prisma.sector.delete({ where: { id: sectorId } });
  }

  // Fares/taxes always come back with taxes included, so a caller can compute the
  // fare+tax rollup for a booking without a second round trip (TASKS.md T31).
  findFares(bookingId: string) {
    return this.prisma.fare.findMany({
      where: { bookingId },
      include: { taxes: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findFareById(bookingId: string, fareId: string) {
    return this.prisma.fare.findFirst({
      where: { id: fareId, bookingId },
      include: { taxes: true },
    });
  }

  findPassengerInBooking(bookingId: string, passengerId: string) {
    return this.prisma.passenger.findFirst({ where: { id: passengerId, bookingId } });
  }

  findSectorInBooking(bookingId: string, sectorId: string) {
    return this.prisma.sector.findFirst({ where: { id: sectorId, bookingId } });
  }

  createFare(bookingId: string, data: Record<string, unknown>) {
    return this.prisma.fare.create({
      data: { ...data, bookingId } as Prisma.FareUncheckedCreateInput,
      include: { taxes: true },
    });
  }

  updateFare(fareId: string, data: Record<string, unknown>) {
    return this.prisma.fare.update({
      where: { id: fareId },
      data: data as Prisma.FareUpdateInput,
      include: { taxes: true },
    });
  }

  deleteFare(fareId: string) {
    return this.prisma.fare.delete({ where: { id: fareId } });
  }

  findTaxes(fareId: string) {
    return this.prisma.tax.findMany({ where: { fareId }, orderBy: { createdAt: 'asc' } });
  }

  findTaxById(fareId: string, taxId: string) {
    return this.prisma.tax.findFirst({ where: { id: taxId, fareId } });
  }

  createTax(fareId: string, data: Record<string, unknown>) {
    return this.prisma.tax.create({
      data: { ...data, fareId } as Prisma.TaxUncheckedCreateInput,
    });
  }

  deleteTax(taxId: string) {
    return this.prisma.tax.delete({ where: { id: taxId } });
  }

  findTickets(bookingId: string) {
    return this.prisma.ticket.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } });
  }

  createTicket(bookingId: string, passengerId: string) {
    return this.prisma.ticket.create({ data: { bookingId, passengerId } });
  }

  findRemarks(bookingId: string) {
    return this.prisma.remark.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } });
  }

  createRemark(bookingId: string, data: Record<string, unknown>) {
    return this.prisma.remark.create({
      data: { ...data, bookingId } as Prisma.RemarkUncheckedCreateInput,
    });
  }
}
