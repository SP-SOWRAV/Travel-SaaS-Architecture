import { Module } from '@nestjs/common';
import { CoreModule } from '../../../core/core.module';
import { BookingModule } from '../../flight-booking/booking/booking.module';
import { SettingsModule } from '../../settings/settings.module';
import { WorkflowEngineModule } from '../../../workflow-engine/workflow-engine.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [CoreModule, BookingModule, SettingsModule, WorkflowEngineModule],
  controllers: [InvoiceController],
  providers: [InvoiceRepository, InvoiceService],
  exports: [InvoiceRepository, InvoiceService],
})
export class InvoiceModule {}
