import { Injectable, NotFoundException } from '@nestjs/common';
import { Remark } from '@prisma/client';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { BookingRepository } from '../booking/booking.repository';
import { CreateRemarkDto } from './dto/create-remark.dto';

@Injectable()
export class RemarkService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async requireBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
  }

  async list(bookingId: string): Promise<Remark[]> {
    await this.requireBooking(bookingId);
    return (await this.bookingRepository.findRemarks(bookingId)) as Remark[];
  }

  // No restriction on booking status — remarks can be added freely regardless of stage,
  // unlike Passenger/Sector (TASKS.md T33). No update/delete: append-oriented per
  // DATABASE.md §3.13 — a correction is a new remark, never a mutation of history.
  async create(bookingId: string, dto: CreateRemarkDto): Promise<Remark> {
    await this.requireBooking(bookingId);
    const createdBy = this.tenantContext.requireUserId();
    return (await this.bookingRepository.createRemark(bookingId, {
      ...dto,
      createdBy,
    })) as Remark;
  }
}
