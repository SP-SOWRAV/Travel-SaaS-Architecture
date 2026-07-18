import { Module } from '@nestjs/common';
import { BookingModule } from './booking/booking.module';
import { PassengerModule } from './passenger/passenger.module';
import { SectorModule } from './sector/sector.module';
import { FareModule } from './fare/fare.module';
import { TaxModule } from './tax/tax.module';
import { TicketModule } from './ticket/ticket.module';
import { RemarkModule } from './remarks/remark.module';

// Umbrella module for the Flight Booking domain (MASTER.md §6 module #11) — aggregates
// Booking and its sub-entity modules. All of Booking, Passenger, Sector, Fare, Tax,
// Ticket, and Remarks are wired here so app.module.ts imports one module for the domain.
@Module({
  imports: [BookingModule, PassengerModule, SectorModule, FareModule, TaxModule, TicketModule, RemarkModule],
})
export class FlightBookingModule {}
