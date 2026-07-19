import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { ReceiptService } from './receipt.service';

@Controller('api/v1/receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const receipt = await this.receiptService.getById(id);
    return { data: receipt, meta: {} };
  }
}
