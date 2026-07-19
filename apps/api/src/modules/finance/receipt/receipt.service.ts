import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../payment/payment.repository';

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toReceiptResponse(receipt: Record<string, unknown>) {
  const { tenantId, ...rest } = receipt;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class ReceiptService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getById(id: string) {
    const receipt = await this.paymentRepository.findReceiptById(id);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return toReceiptResponse(receipt as unknown as Record<string, unknown>);
  }
}
