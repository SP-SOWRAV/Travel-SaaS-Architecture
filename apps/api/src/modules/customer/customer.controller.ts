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
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { normalizePagination } from '../../core/pagination/pagination';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async list(@Query('q') q?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const normalized = normalizePagination(page, pageSize);
    return this.customerService.list(q, normalized.page, normalized.pageSize);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const customer = await this.customerService.getById(id);
    return { data: customer, meta: {} };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  async create(@Body() dto: CreateCustomerDto) {
    const customer = await this.customerService.create(dto);
    return { data: customer, meta: {} };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    const customer = await this.customerService.update(id, dto);
    return { data: customer, meta: {} };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.customerService.remove(id);
  }
}
