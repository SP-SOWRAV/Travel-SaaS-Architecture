import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../booking/booking.module';
import { RemarkController } from './remark.controller';
import { RemarkService } from './remark.service';

@Module({
  imports: [CoreModule, BookingModule],
  controllers: [RemarkController],
  providers: [RemarkService],
})
export class RemarkModule {}
