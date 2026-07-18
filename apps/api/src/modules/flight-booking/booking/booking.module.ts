import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { CustomerModule } from '../../customer/customer.module';
import { BranchModule } from '../../branch/branch.module';
import { SettingsModule } from '../../settings/settings.module';
import { BookingController } from './booking.controller';
import { BookingRepository } from './booking.repository';
import { BookingService } from './booking.service';

@Module({
  imports: [CoreModule, CustomerModule, BranchModule, SettingsModule],
  controllers: [BookingController],
  providers: [BookingRepository, BookingService],
  exports: [BookingRepository],
})
export class BookingModule {}
