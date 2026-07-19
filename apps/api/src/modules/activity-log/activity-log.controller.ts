import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';

@Controller('api/v1/activity-log')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async list(@Query('entityType') entityType?: string, @Query('action') action?: string) {
    const logs = await this.activityLogService.list({ entityType, action });
    return { data: logs, meta: {} };
  }
}
