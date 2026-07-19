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

  async list(bookingId: string): Promise<Sector[]> {
    await this.requireBooking(bookingId);
    return (await this.bookingRepository.findSectors(bookingId)) as Sector[];
  }

  async create(bookingId: string, dto: CreateSectorDto): Promise<Sector> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    try {
      return (await this.bookingRepository.createSector(bookingId, { ...dto })) as Sector;
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new UnprocessableEntityException(
          'airlineId/originAirportId/destinationAirportId must reference existing records',
        );
      }
      throw err;
    }
  }

  async update(bookingId: string, sectorId: string, dto: UpdateSectorDto): Promise<Sector> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    const existing = await this.bookingRepository.findSectorById(bookingId, sectorId);
    if (!existing) {
      throw new NotFoundException('Sector not found');
    }
    try {
      return (await this.bookingRepository.updateSector(sectorId, { ...dto })) as Sector;
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
