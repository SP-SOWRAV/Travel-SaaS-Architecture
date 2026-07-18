import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { CreateTaxDto } from './dto/create-tax.dto';
import { TaxService } from './tax.service';

@Controller('api/v1/bookings/:bookingId/fares/:fareId/taxes')
@UseGuards(JwtAuthGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  async list(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('fareId', ParseUUIDPipe) fareId: string,
  ) {
    const taxes = await this.taxService.list(bookingId, fareId);
    return { data: taxes, meta: {} };
  }

  @Post()
  async create(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('fareId', ParseUUIDPipe) fareId: string,
    @Body() dto: CreateTaxDto,
  ) {
    const tax = await this.taxService.create(bookingId, fareId, dto);
    return { data: tax, meta: {} };
  }

  @Delete(':taxId')
  @HttpCode(204)
  async remove(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('fareId', ParseUUIDPipe) fareId: string,
    @Param('taxId', ParseUUIDPipe) taxId: string,
  ) {
    await this.taxService.remove(bookingId, fareId, taxId);
  }
}
