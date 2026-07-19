import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { SettingsModule } from '../settings/settings.module';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [CoreModule, SettingsModule],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
