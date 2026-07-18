import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../booking/booking.module';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';

@Module({
  imports: [CoreModule, BookingModule],
  controllers: [TaxController],
  providers: [TaxService],
})
export class TaxModule {}
