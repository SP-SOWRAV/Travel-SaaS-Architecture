import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../booking/booking.module';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [CoreModule, BookingModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
