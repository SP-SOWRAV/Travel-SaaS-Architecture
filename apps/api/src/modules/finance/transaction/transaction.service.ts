import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../core/pagination/pagination';
import { TransactionRepository } from './transaction.repository';

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toTransactionResponse(transaction: Record<string, unknown>) {
  const { tenantId, ...rest } = transaction;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async list(type: string | undefined, page: number, pageSize: number): Promise<PaginatedResult<unknown>> {
    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    const result = await this.transactionRepository.paginate<Record<string, unknown>>({
      where,
      orderBy: { createdAt: 'desc' },
      page,
      pageSize,
    });
    return { data: result.data.map(toTransactionResponse), meta: result.meta };
  }

  async getById(id: string) {
    const transaction = (await this.transactionRepository.findById(id)) as Record<string, unknown> | null;
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return toTransactionResponse(transaction);
  }
}
