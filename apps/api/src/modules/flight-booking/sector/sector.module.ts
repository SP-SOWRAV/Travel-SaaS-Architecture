import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../booking/booking.module';
import { SectorController } from './sector.controller';
import { SectorService } from './sector.service';

@Module({
  imports: [CoreModule, BookingModule],
  controllers: [SectorController],
  providers: [SectorService],
})
export class SectorModule {}
