import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { CreateRemarkDto } from './dto/create-remark.dto';
import { RemarkService } from './remark.service';

@Controller('api/v1/bookings/:bookingId/remarks')
@UseGuards(JwtAuthGuard)
export class RemarkController {
  constructor(private readonly remarkService: RemarkService) {}

  @Get()
  async list(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    const remarks = await this.remarkService.list(bookingId);
    return { data: remarks, meta: {} };
  }

  @Post()
  async create(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Body() dto: CreateRemarkDto) {
    const remark = await this.remarkService.create(bookingId, dto);
    return { data: remark, meta: {} };
  }
}
