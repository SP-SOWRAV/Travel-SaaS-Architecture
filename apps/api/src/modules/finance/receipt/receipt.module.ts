import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { PaymentModule } from '../payment/payment.module';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';

@Module({
  imports: [CoreModule, PaymentModule],
  controllers: [ReceiptController],
  providers: [ReceiptService],
})
export class ReceiptModule {}
