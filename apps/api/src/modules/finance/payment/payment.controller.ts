import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('invoices/:invoiceId/payments')
  async record(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Body() dto: CreatePaymentDto) {
    const payment = await this.paymentService.recordPayment(invoiceId, dto);
    return { data: payment, meta: {} };
  }

  @Get('invoices/:invoiceId/payments')
  async list(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    const payments = await this.paymentService.listByInvoice(invoiceId);
    return { data: payments, meta: {} };
  }

  @Get('payments/:id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const payment = await this.paymentService.getById(id);
    return { data: payment, meta: {} };
  }
}
