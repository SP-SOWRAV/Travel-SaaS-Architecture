import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../core/repository/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

// Owns Booking and its direct sub-entities (Passenger, Sector, Fare, Tax, Ticket, Remarks)
// as one aggregate (CODING_STANDARDS §4) — they're always read/written together, and none
// carry their own tenant_id (DATABASE.md §3.8+), so tenant safety flows from verifying the
// parent Booking here (inherited findById) before any sub-entity operation below.
@Injectable()
export class BookingRepository extends BaseRepository<Prisma.BookingDelegate> {
  constructor(
    private readonly prisma: PrismaService,
    tenantContext: TenantContextService,
  ) {
    super(prisma.booking, tenantContext, true);
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
}
