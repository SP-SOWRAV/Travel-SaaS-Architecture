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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async list() {
    const users = await this.userService.list();
    return { data: users, meta: {} };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.getById(id);
    return { data: user, meta: {} };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    return { data: user, meta: {} };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.update(id, dto);
    return { data: user, meta: {} };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.agency_admin)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.remove(id);
  }
}
