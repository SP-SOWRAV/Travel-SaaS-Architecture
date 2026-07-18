import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../booking/booking.module';
import { FareController } from './fare.controller';
import { FareService } from './fare.service';

@Module({
  imports: [CoreModule, BookingModule],
  controllers: [FareController],
  providers: [FareService],
})
export class FareModule {}
