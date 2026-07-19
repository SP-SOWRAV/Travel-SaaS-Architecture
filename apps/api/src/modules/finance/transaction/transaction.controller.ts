import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { TransactionService } from './transaction.service';

@Controller('api/v1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async list(@Query('type') type?: string) {
    const transactions = await this.transactionService.list(type);
    return { data: transactions, meta: {} };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const transaction = await this.transactionService.getById(id);
    return { data: transaction, meta: {} };
  }
}
