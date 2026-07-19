import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { normalizePagination } from '../../core/pagination/pagination';
import { ActivityLogService } from './activity-log.service';

@Controller('api/v1/activity-log')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async list(
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const normalized = normalizePagination(page, pageSize);
    return this.activityLogService.list({ entityType, action }, normalized.page, normalized.pageSize);
  }
}
