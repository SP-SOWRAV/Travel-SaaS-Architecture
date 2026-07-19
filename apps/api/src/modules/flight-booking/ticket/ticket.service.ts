import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Booking, Ticket } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreateTicketDto } from './dto/create-ticket.dto';

export interface TicketResponse {
  id: string;
  bookingId: string;
  passengerId: string;
  ticketNumber: string | null;
  status: string;
  issuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// HIGH-9 hardening: an explicit allow-list, not the raw Prisma row (same rationale as
// Sector/Fare/Tax/Remark's own response mappers).
function toTicketResponse(ticket: Ticket): TicketResponse {
  return {
    id: ticket.id,
    bookingId: ticket.bookingId,
    passengerId: ticket.passengerId,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    issuedAt: ticket.issuedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

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

  async list(bookingId: string): Promise<TicketResponse[]> {
    await this.requireBooking(bookingId);
    const tickets = (await this.bookingRepository.findTickets(bookingId)) as Ticket[];
    return tickets.map(toTicketResponse);
  }

  // Placeholder only (TASKS.md T33) — ticketNumber/status/issuedAt stay at their DB
  // defaults (null/unissued/null) until the Workflow Engine's Issue Ticket transition
  // (T39) populates them for real.
  async create(bookingId: string, dto: CreateTicketDto): Promise<TicketResponse> {
    await this.requireBooking(bookingId);
    const passenger = await this.bookingRepository.findPassengerInBooking(bookingId, dto.passengerId);
    if (!passenger) {
      throw new UnprocessableEntityException('passengerId must belong to this booking');
    }
    const ticket = (await this.bookingRepository.createTicket(bookingId, dto.passengerId)) as Ticket;
    return toTicketResponse(ticket);
  }
}
