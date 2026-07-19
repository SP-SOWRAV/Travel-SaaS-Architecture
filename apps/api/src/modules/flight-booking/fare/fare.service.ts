import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Booking, Fare, Prisma } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003';
}

@Injectable()
export class FareService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  private async requireBooking(bookingId: string): Promise<Booking> {
    const booking = (await this.bookingRepository.findById(bookingId)) as Booking | null;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async list(bookingId: string): Promise<Fare[]> {
    await this.requireBooking(bookingId);
    return (await this.bookingRepository.findFares(bookingId)) as Fare[];
  }

  async create(bookingId: string, dto: CreateFareDto): Promise<Fare> {
    const booking = await this.requireBooking(bookingId);

    // API_RULES §5: referenced IDs are validated as belonging to this booking before use —
    // a passenger/sector from elsewhere fails as a 422 body-validation error, not a 404.
    const [passenger, sector] = await Promise.all([
      this.bookingRepository.findPassengerInBooking(bookingId, dto.passengerId),
      this.bookingRepository.findSectorInBooking(bookingId, dto.sectorId),
    ]);
    if (!passenger) {
      throw new UnprocessableEntityException('passengerId must belong to this booking');
    }
    if (!sector) {
      throw new UnprocessableEntityException('sectorId must belong to this booking');
    }

    try {
      // currencyCode always mirrors the booking's currency (DATABASE.md §3.10 "from
      // booking") — never client-supplied, consistent with API_RULES §19.
      return (await this.bookingRepository.createFare(bookingId, {
        passengerId: dto.passengerId,
        sectorId: dto.sectorId,
        baseAmount: dto.baseAmount,
        currencyCode: booking.currencyCode,
      })) as Fare;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A fare already exists for this passenger and sector');
      }
      throw err;
    }
  }

  async update(bookingId: string, fareId: string, dto: UpdateFareDto): Promise<Fare> {
    await this.requireBooking(bookingId);
    const existing = await this.bookingRepository.findFareById(bookingId, fareId);
    if (!existing) {
      throw new NotFoundException('Fare not found');
    }
    return (await this.bookingRepository.updateFare(fareId, { ...dto })) as Fare;
  }

  async remove(bookingId: string, fareId: string): Promise<void> {
    await this.requireBooking(bookingId);
    const existing = await this.bookingRepository.findFareById(bookingId, fareId);
    if (!existing) {
      throw new NotFoundException('Fare not found');
    }
    try {
      await this.bookingRepository.deleteFare(fareId);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException('Cannot delete a fare that already has taxes referencing it');
      }
      throw err;
    }
  }
}
