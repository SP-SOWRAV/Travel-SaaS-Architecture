import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../../flight-booking/booking/booking.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { WorkflowEngineModule } from '../../../workflow-engine/workflow-engine.module';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

@Module({
  imports: [CoreModule, BookingModule, InvoiceModule, WorkflowEngineModule],
  controllers: [PaymentController],
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentRepository],
})
export class PaymentModule {}
