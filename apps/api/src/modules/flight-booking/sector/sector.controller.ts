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
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { SectorService } from './sector.service';

@Controller('api/v1/bookings/:bookingId/sectors')
@UseGuards(JwtAuthGuard)
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Get()
  async list(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    const sectors = await this.sectorService.list(bookingId);
    return { data: sectors, meta: {} };
  }

  @Post()
  async create(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Body() dto: CreateSectorDto) {
    const sector = await this.sectorService.create(bookingId, dto);
    return { data: sector, meta: {} };
  }

  @Patch(':sectorId')
  async update(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
    @Body() dto: UpdateSectorDto,
  ) {
    const sector = await this.sectorService.update(bookingId, sectorId, dto);
    return { data: sector, meta: {} };
  }

  @Delete(':sectorId')
  @HttpCode(204)
  async remove(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('sectorId', ParseUUIDPipe) sectorId: string,
  ) {
    await this.sectorService.remove(bookingId, sectorId);
  }
}
