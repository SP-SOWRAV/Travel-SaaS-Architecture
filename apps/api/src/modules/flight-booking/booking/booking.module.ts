import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingRepository } from './booking.repository';

@Module({
  imports: [CoreModule],
  providers: [BookingRepository],
  exports: [BookingRepository],
})
export class BookingModule {}
