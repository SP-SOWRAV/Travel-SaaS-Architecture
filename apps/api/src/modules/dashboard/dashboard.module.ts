import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { BookingModule } from '../flight-booking/booking/booking.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [CoreModule, BookingModule, ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
