import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Booking, Prisma, Sector } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';

function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003';
}

export interface SectorResponse {
  id: string;
  bookingId: string;
  airlineId: string;
  originAirportId: string;
  destinationAirportId: string;
  flightNumber: string;
  cabinClass: string;
  departureAt: Date;
  arrivalAt: Date;
  sequenceNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

// HIGH-9 hardening: an explicit allow-list, not the raw Prisma row — Sector carries no
// tenant_id of its own today, but returning the ORM row directly means any future column
// added to this table leaks onto the wire with zero code change to catch it (the same
// defense-in-depth already applied to Payment/Refund/Booking's response shaping).
function toSectorResponse(sector: Sector): SectorResponse {
  return {
    id: sector.id,
    bookingId: sector.bookingId,
    airlineId: sector.airlineId,
    originAirportId: sector.originAirportId,
    destinationAirportId: sector.destinationAirportId,
    flightNumber: sector.flightNumber,
    cabinClass: sector.cabinClass,
    departureAt: sector.departureAt,
    arrivalAt: sector.arrivalAt,
    sequenceNumber: sector.sequenceNumber,
    createdAt: sector.createdAt,
    updatedAt: sector.updatedAt,
  };
}

@Injectable()
export class SectorService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  private async requireBooking(bookingId: string): Promise<Booking> {
    const booking = (await this.bookingRepository.findById(bookingId)) as Booking | null;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  // Soft, application-level check (mirrors T29's Passenger restriction) — the Workflow
  // Engine (Phase 6) becomes the authoritative enforcement point once it exists.
  private assertDraft(booking: Booking): void {
    if (booking.status !== 'draft') {
      throw new ConflictException('Sectors can only be modified while the booking is in Draft status');
    }
  }

  async list(bookingId: string): Promise<SectorResponse[]> {
    await this.requireBooking(bookingId);
    const sectors = (await this.bookingRepository.findSectors(bookingId)) as Sector[];
    return sectors.map(toSectorResponse);
  }

  async create(bookingId: string, dto: CreateSectorDto): Promise<SectorResponse> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    try {
      const sector = (await this.bookingRepository.createSector(bookingId, { ...dto })) as Sector;
      return toSectorResponse(sector);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new UnprocessableEntityException(
          'airlineId/originAirportId/destinationAirportId must reference existing records',
        );
      }
      throw err;
    }
  }

  async update(bookingId: string, sectorId: string, dto: UpdateSectorDto): Promise<SectorResponse> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    const existing = await this.bookingRepository.findSectorById(bookingId, sectorId);
    if (!existing) {
      throw new NotFoundException('Sector not found');
    }
    try {
      const sector = (await this.bookingRepository.updateSector(sectorId, { ...dto })) as Sector;
      return toSectorResponse(sector);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new UnprocessableEntityException(
          'airlineId/originAirportId/destinationAirportId must reference existing records',
        );
      }
      throw err;
    }
  }

  async remove(bookingId: string, sectorId: string): Promise<void> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    const existing = await this.bookingRepository.findSectorById(bookingId, sectorId);
    if (!existing) {
      throw new NotFoundException('Sector not found');
    }
    try {
      await this.bookingRepository.deleteSector(sectorId);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException('Cannot delete a sector that already has a fare referencing it');
      }
      throw err;
    }
  }
}
