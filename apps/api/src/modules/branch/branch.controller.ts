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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('api/v1/branches')
@UseGuards(JwtAuthGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  async list() {
    const branches = await this.branchService.list();
    return { data: branches, meta: {} };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const branch = await this.branchService.getById(id);
    return { data: branch, meta: {} };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  async create(@Body() dto: CreateBranchDto) {
    const branch = await this.branchService.create(dto);
    return { data: branch, meta: {} };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
    const branch = await this.branchService.update(id, dto);
    return { data: branch, meta: {} };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.branchService.remove(id);
  }
}
