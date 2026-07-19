import { Injectable, NotFoundException } from '@nestjs/common';
import { Tax } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreateTaxDto } from './dto/create-tax.dto';

export interface TaxResponse {
  id: string;
  fareId: string;
  taxCode: string;
  description: string | null;
  amount: Tax['amount'];
  createdAt: Date;
}

// HIGH-9 hardening: an explicit allow-list, not the raw Prisma row (same rationale as
// Sector/Ticket/Remark's own response mappers) — Tax carries no tenant_id of its own today,
// but this guards against a future column leaking onto the wire unnoticed.
export function toTaxResponse(tax: Tax): TaxResponse {
  return {
    id: tax.id,
    fareId: tax.fareId,
    taxCode: tax.taxCode,
    description: tax.description,
    amount: tax.amount,
    createdAt: tax.createdAt,
  };
}

@Injectable()
export class TaxService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  private async requireFare(bookingId: string, fareId: string) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const fare = await this.bookingRepository.findFareById(bookingId, fareId);
    if (!fare) {
      throw new NotFoundException('Fare not found');
    }
    return fare;
  }

  async list(bookingId: string, fareId: string): Promise<TaxResponse[]> {
    await this.requireFare(bookingId, fareId);
    const taxes = (await this.bookingRepository.findTaxes(fareId)) as Tax[];
    return taxes.map(toTaxResponse);
  }

  async create(bookingId: string, fareId: string, dto: CreateTaxDto): Promise<TaxResponse> {
    await this.requireFare(bookingId, fareId);
    const tax = (await this.bookingRepository.createTax(fareId, { ...dto })) as Tax;
    return toTaxResponse(tax);
  }

  async remove(bookingId: string, fareId: string, taxId: string): Promise<void> {
    await this.requireFare(bookingId, fareId);
    const existing = await this.bookingRepository.findTaxById(fareId, taxId);
    if (!existing) {
      throw new NotFoundException('Tax not found');
    }
    await this.bookingRepository.deleteTax(taxId);
  }
}
