import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogService } from './activity-log.service';

@Module({
  imports: [CoreModule],
  controllers: [ActivityLogController],
  providers: [ActivityLogRepository, ActivityLogService],
})
export class ActivityLogModule {}
