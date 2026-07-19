import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundService } from './refund.service';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post('invoices/:invoiceId/refunds')
  async process(@Param('invoiceId', ParseUUIDPipe) invoiceId: string, @Body() dto: CreateRefundDto) {
    const refund = await this.refundService.processRefund(invoiceId, dto);
    return { data: refund, meta: {} };
  }

  @Get('invoices/:invoiceId/refunds')
  async list(@Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    const refunds = await this.refundService.listByInvoice(invoiceId);
    return { data: refunds, meta: {} };
  }

  @Get('refunds/:id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const refund = await this.refundService.getById(id);
    return { data: refund, meta: {} };
  }
}
