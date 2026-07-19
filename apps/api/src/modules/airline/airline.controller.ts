import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { normalizePagination } from '../../core/pagination/pagination';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { AirlineService } from './airline.service';
import { CreateAirlineDto } from './dto/create-airline.dto';
import { UpdateAirlineDto } from './dto/update-airline.dto';

// API_RULES §13: global reference data is readable by any authenticated role, writable
// only by platform_admin.
@Controller('api/v1/airlines')
@UseGuards(JwtAuthGuard)
export class AirlineController {
  constructor(private readonly airlineService: AirlineService) {}

  @Get()
  async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const normalized = normalizePagination(page, pageSize);
    return this.airlineService.list(normalized.page, normalized.pageSize);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const airline = await this.airlineService.getById(id);
    return { data: airline, meta: {} };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.platform_admin)
  async create(@Body() dto: CreateAirlineDto) {
    const airline = await this.airlineService.create(dto);
    return { data: airline, meta: {} };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.platform_admin)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAirlineDto) {
    const airline = await this.airlineService.update(id, dto);
    return { data: airline, meta: {} };
  }
}
