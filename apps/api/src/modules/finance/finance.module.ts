import { Module } from '@nestjs/common';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { ReceiptModule } from './receipt/receipt.module';
import { RefundModule } from './refund/refund.module';
import { TransactionModule } from './transaction/transaction.module';

// Umbrella module for the Finance domain (MASTER.md §6 module #12) — aggregates Invoice,
// Payment, Receipt, Refund, and Transaction, mirroring how flight-booking.module.ts
// aggregates its own sub-entity modules.
@Module({
  imports: [InvoiceModule, PaymentModule, ReceiptModule, RefundModule, TransactionModule],
})
export class FinanceModule {}
