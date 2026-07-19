import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository } from './transaction.repository';

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toTransactionResponse(transaction: Record<string, unknown>) {
  const { tenantId, ...rest } = transaction;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async list(type?: string) {
    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    const transactions = (await this.transactionRepository.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })) as Record<string, unknown>[];
    return transactions.map(toTransactionResponse);
  }

  async getById(id: string) {
    const transaction = (await this.transactionRepository.findById(id)) as Record<string, unknown> | null;
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return toTransactionResponse(transaction);
  }
}
