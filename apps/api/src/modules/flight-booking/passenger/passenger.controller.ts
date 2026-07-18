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
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import { PassengerService } from './passenger.service';

@Controller('api/v1/bookings/:bookingId/passengers')
@UseGuards(JwtAuthGuard)
export class PassengerController {
  constructor(private readonly passengerService: PassengerService) {}

  @Get()
  async list(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    const passengers = await this.passengerService.list(bookingId);
    return { data: passengers, meta: {} };
  }

  @Post()
  async create(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: CreatePassengerDto,
  ) {
    const passenger = await this.passengerService.create(bookingId, dto);
    return { data: passenger, meta: {} };
  }

  @Patch(':passengerId')
  async update(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('passengerId', ParseUUIDPipe) passengerId: string,
    @Body() dto: UpdatePassengerDto,
  ) {
    const passenger = await this.passengerService.update(bookingId, passengerId, dto);
    return { data: passenger, meta: {} };
  }

  @Delete(':passengerId')
  @HttpCode(204)
  async remove(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('passengerId', ParseUUIDPipe) passengerId: string,
  ) {
    await this.passengerService.remove(bookingId, passengerId);
  }
}
