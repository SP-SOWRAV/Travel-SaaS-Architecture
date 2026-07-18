import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../booking/booking.module';
import { PassengerController } from './passenger.controller';
import { PassengerService } from './passenger.service';

@Module({
  imports: [CoreModule, BookingModule],
  controllers: [PassengerController],
  providers: [PassengerService],
})
export class PassengerModule {}
