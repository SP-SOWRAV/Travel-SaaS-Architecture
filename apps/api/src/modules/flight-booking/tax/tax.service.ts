import { Injectable, NotFoundException } from '@nestjs/common';
import { Tax } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CreateTaxDto } from './dto/create-tax.dto';

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

  async list(bookingId: string, fareId: string): Promise<Tax[]> {
    await this.requireFare(bookingId, fareId);
    return (await this.bookingRepository.findTaxes(fareId)) as Tax[];
  }

  async create(bookingId: string, fareId: string, dto: CreateTaxDto): Promise<Tax> {
    await this.requireFare(bookingId, fareId);
    return (await this.bookingRepository.createTax(fareId, { ...dto })) as Tax;
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
