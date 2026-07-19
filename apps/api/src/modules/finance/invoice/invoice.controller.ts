import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { InvoiceService } from './invoice.service';

// API_RULES §2: `POST /bookings/:id/invoice` is the Workflow-adjacent action-endpoint
// exception; `/invoices` itself is the plain resource-oriented surface for reads, matching
// how T42's `/invoices/:id/payments` is nested under the resource this controller owns.
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('bookings/:bookingId/invoice')
  async generate(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Body() dto: GenerateInvoiceDto) {
    const invoice = await this.invoiceService.generateFromBooking(bookingId, dto.reason);
    return { data: invoice, meta: {} };
  }

  @Get('invoices')
  async list(@Query('status') status?: string, @Query('bookingId') bookingId?: string) {
    const invoices = await this.invoiceService.list(status, bookingId);
    return { data: invoices, meta: {} };
  }

  @Get('invoices/:id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const invoice = await this.invoiceService.getById(id);
    return { data: invoice, meta: {} };
  }
}
