import { Module } from '@nestjs/common';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { ReceiptModule } from './receipt/receipt.module';

// Umbrella module for the Finance domain (MASTER.md §6 module #12) — aggregates Invoice,
// Payment, and Receipt, and, as T43 lands, Refund/Transaction, mirroring how
// flight-booking.module.ts aggregates its own sub-entity modules.
@Module({
  imports: [InvoiceModule, PaymentModule, ReceiptModule],
})
export class FinanceModule {}
