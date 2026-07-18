import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';
import { FareService } from './fare.service';

@Controller('api/v1/bookings/:bookingId/fares')
@UseGuards(JwtAuthGuard)
export class FareController {
  constructor(private readonly fareService: FareService) {}

  @Get()
  async list(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    const fares = await this.fareService.list(bookingId);
    return { data: fares, meta: {} };
  }

  @Post()
  async create(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Body() dto: CreateFareDto) {
    const fare = await this.fareService.create(bookingId, dto);
    return { data: fare, meta: {} };
  }

  @Patch(':fareId')
  async update(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('fareId', ParseUUIDPipe) fareId: string,
    @Body() dto: UpdateFareDto,
  ) {
    const fare = await this.fareService.update(bookingId, fareId, dto);
    return { data: fare, meta: {} };
  }

  @Delete(':fareId')
  @HttpCode(204)
  async remove(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('fareId', ParseUUIDPipe) fareId: string,
  ) {
    await this.fareService.remove(bookingId, fareId);
  }
}
