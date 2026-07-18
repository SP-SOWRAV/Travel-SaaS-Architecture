import { Module } from '@nestjs/common';
import { BookingModule } from './booking/booking.module';
import { PassengerModule } from './passenger/passenger.module';
import { SectorModule } from './sector/sector.module';

// Umbrella module for the Flight Booking domain (MASTER.md §6 module #11) — aggregates
// Booking and its sub-entity modules (Passenger, Sector now; Fare/Tax/Ticket/Remarks join
// as their tasks land) so app.module.ts imports one module for the whole domain.
@Module({
  imports: [BookingModule, PassengerModule, SectorModule],
})
export class FlightBookingModule {}
