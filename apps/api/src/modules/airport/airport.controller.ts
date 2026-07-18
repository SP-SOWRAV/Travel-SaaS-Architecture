import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { AirportService } from './airport.service';
import { CreateAirportDto } from './dto/create-airport.dto';
import { UpdateAirportDto } from './dto/update-airport.dto';

// API_RULES §13: global reference data is readable by any authenticated role, writable
// only by platform_admin.
@Controller('api/v1/airports')
@UseGuards(JwtAuthGuard)
export class AirportController {
  constructor(private readonly airportService: AirportService) {}

  @Get()
  async list() {
    const airports = await this.airportService.list();
    return { data: airports, meta: {} };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const airport = await this.airportService.getById(id);
    return { data: airport, meta: {} };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.platform_admin)
  async create(@Body() dto: CreateAirportDto) {
    const airport = await this.airportService.create(dto);
    return { data: airport, meta: {} };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.platform_admin)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAirportDto) {
    const airport = await this.airportService.update(id, dto);
    return { data: airport, meta: {} };
  }
}
