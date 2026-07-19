import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, Passenger, Prisma } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';

function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003';
}

export interface PassengerResponse {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  passportNumber: string | null;
  passengerType: string;
  nationalityCountryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPassengerResponse(passenger: Passenger): PassengerResponse {
  return passenger;
}

@Injectable()
export class PassengerService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  private async requireBooking(bookingId: string): Promise<Booking> {
    const booking = (await this.bookingRepository.findById(bookingId)) as Booking | null;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  // Acceptance criteria (TASKS.md T29): a soft, application-level check — the Workflow
  // Engine (Phase 6) becomes the authoritative enforcement point once it exists.
  private assertDraft(booking: Booking): void {
    if (booking.status !== 'draft') {
      throw new ConflictException('Passengers can only be modified while the booking is in Draft status');
    }
  }

  async list(bookingId: string): Promise<PassengerResponse[]> {
    await this.requireBooking(bookingId);
    const passengers = await this.bookingRepository.findPassengers(bookingId);
    return (passengers as Passenger[]).map(toPassengerResponse);
  }

  async create(bookingId: string, dto: CreatePassengerDto): Promise<PassengerResponse> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    const passenger = (await this.bookingRepository.createPassenger(bookingId, {
      ...dto,
    })) as Passenger;
    return toPassengerResponse(passenger);
  }

  async update(
    bookingId: string,
    passengerId: string,
    dto: UpdatePassengerDto,
  ): Promise<PassengerResponse> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    const existing = await this.bookingRepository.findPassengerById(bookingId, passengerId);
    if (!existing) {
      throw new NotFoundException('Passenger not found');
    }
    const passenger = (await this.bookingRepository.updatePassenger(passengerId, {
      ...dto,
    })) as Passenger;
    return toPassengerResponse(passenger);
  }

  async remove(bookingId: string, passengerId: string): Promise<void> {
    const booking = await this.requireBooking(bookingId);
    this.assertDraft(booking);
    const existing = await this.bookingRepository.findPassengerById(bookingId, passengerId);
    if (!existing) {
      throw new NotFoundException('Passenger not found');
    }
    try {
      await this.bookingRepository.deletePassenger(passengerId);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException(
          'Cannot delete a passenger that already has a fare or ticket referencing it',
        );
      }
      throw err;
    }
  }
}
