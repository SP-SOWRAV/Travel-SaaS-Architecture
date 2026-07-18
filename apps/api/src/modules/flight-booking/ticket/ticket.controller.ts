import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketService } from './ticket.service';

@Controller('api/v1/bookings/:bookingId/tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  async list(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    const tickets = await this.ticketService.list(bookingId);
    return { data: tickets, meta: {} };
  }

  @Post()
  async create(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Body() dto: CreateTicketDto) {
    const ticket = await this.ticketService.create(bookingId, dto);
    return { data: ticket, meta: {} };
  }
}
