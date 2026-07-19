import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { normalizePagination } from '../../../core/pagination/pagination';
import { BookingService } from './booking.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { IssueTicketBookingDto } from './dto/issue-ticket-booking.dto';
import { ReserveBookingDto } from './dto/reserve-booking.dto';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const normalized = normalizePagination(page, pageSize);
    return this.bookingService.list(status, branchId, normalized.page, normalized.pageSize);
  }

  @Post()
  async create(@Body() dto: CreateBookingDto) {
    const booking = await this.bookingService.createAggregate(dto);
    return { data: booking, meta: {} };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingService.getAggregate(id);
    return { data: booking, meta: {} };
  }

  @Post(':id/reserve')
  async reserve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReserveBookingDto) {
    const booking = await this.bookingService.reserve(id, dto.reason);
    return { data: booking, meta: {} };
  }

  @Post(':id/issue-ticket')
  async issueTicket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: IssueTicketBookingDto) {
    const booking = await this.bookingService.issueTicket(id, dto.reason);
    return { data: booking, meta: {} };
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelBookingDto) {
    const booking = await this.bookingService.cancel(id, dto.reason);
    return { data: booking, meta: {} };
  }

  @Get(':id/transitions')
  async getTransitions(@Param('id', ParseUUIDPipe) id: string) {
    const transitions = await this.bookingService.getTransitionHistory(id);
    return { data: transitions, meta: {} };
  }
}
