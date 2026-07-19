import { Injectable, NotFoundException } from '@nestjs/common';
import { Remark } from '@prisma/client';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { BookingRepository } from '../booking/booking.repository';
import { CreateRemarkDto } from './dto/create-remark.dto';

export interface RemarkResponse {
  id: string;
  bookingId: string;
  remarkType: string;
  remarkText: string;
  createdBy: string;
  createdAt: Date;
}

// HIGH-9 hardening: an explicit allow-list, not the raw Prisma row (same rationale as
// Sector/Fare/Tax/Ticket's own response mappers).
function toRemarkResponse(remark: Remark): RemarkResponse {
  return {
    id: remark.id,
    bookingId: remark.bookingId,
    remarkType: remark.remarkType,
    remarkText: remark.remarkText,
    createdBy: remark.createdBy,
    createdAt: remark.createdAt,
  };
}

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

  async list(bookingId: string): Promise<RemarkResponse[]> {
    await this.requireBooking(bookingId);
    const remarks = (await this.bookingRepository.findRemarks(bookingId)) as Remark[];
    return remarks.map(toRemarkResponse);
  }

  // No restriction on booking status — remarks can be added freely regardless of stage,
  // unlike Passenger/Sector (TASKS.md T33). No update/delete: append-oriented per
  // DATABASE.md §3.13 — a correction is a new remark, never a mutation of history.
  async create(bookingId: string, dto: CreateRemarkDto): Promise<RemarkResponse> {
    await this.requireBooking(bookingId);
    const createdBy = this.tenantContext.requireUserId();
    const remark = (await this.bookingRepository.createRemark(bookingId, {
      ...dto,
      createdBy,
    })) as Remark;
    return toRemarkResponse(remark);
  }
}
