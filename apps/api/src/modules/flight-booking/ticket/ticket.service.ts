import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Booking, Ticket } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  private async requireBooking(bookingId: string): Promise<Booking> {
    const booking = (await this.bookingRepository.findById(bookingId)) as Booking | null;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async list(bookingId: string): Promise<Ticket[]> {
    await this.requireBooking(bookingId);
    return (await this.bookingRepository.findTickets(bookingId)) as Ticket[];
  }

  // Placeholder only (TASKS.md T33) — ticketNumber/status/issuedAt stay at their DB
  // defaults (null/unissued/null) until the Workflow Engine's Issue Ticket transition
  // (T39) populates them for real.
  async create(bookingId: string, dto: CreateTicketDto): Promise<Ticket> {
    await this.requireBooking(bookingId);
    const passenger = await this.bookingRepository.findPassengerInBooking(bookingId, dto.passengerId);
    if (!passenger) {
      throw new UnprocessableEntityException('passengerId must belong to this booking');
    }
    return (await this.bookingRepository.createTicket(bookingId, dto.passengerId)) as Ticket;
  }
}
