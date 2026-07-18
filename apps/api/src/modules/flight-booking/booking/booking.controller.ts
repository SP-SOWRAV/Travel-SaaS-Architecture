import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async list(@Query('status') status?: string, @Query('branchId') branchId?: string) {
    const bookings = await this.bookingService.list(status, branchId);
    return { data: bookings, meta: {} };
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
}
