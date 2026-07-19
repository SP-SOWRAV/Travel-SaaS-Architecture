import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../../flight-booking/booking/booking.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PaymentModule } from '../payment/payment.module';
import { WorkflowEngineModule } from '../../../workflow-engine/workflow-engine.module';
import { RefundController } from './refund.controller';
import { RefundRepository } from './refund.repository';
import { RefundService } from './refund.service';

@Module({
  imports: [CoreModule, BookingModule, InvoiceModule, PaymentModule, WorkflowEngineModule],
  controllers: [RefundController],
  providers: [RefundRepository, RefundService],
})
export class RefundModule {}
