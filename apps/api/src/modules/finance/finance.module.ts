import { Module } from '@nestjs/common';
import { InvoiceModule } from './invoice/invoice.module';

// Umbrella module for the Finance domain (MASTER.md §6 module #12) — aggregates Invoice
// and, as later tasks land, Payment/Receipt/Refund/Transaction, mirroring how
// flight-booking.module.ts aggregates its own sub-entity modules.
@Module({
  imports: [InvoiceModule],
})
export class FinanceModule {}
