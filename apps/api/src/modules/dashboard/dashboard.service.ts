import { Injectable } from '@nestjs/common';
import { Booking } from '@prisma/client';
import { BookingRepository } from '../flight-booking/booking/booking.repository';
import { ReportsService } from '../reports/reports.service';

export interface RecentBookingSummary {
  id: string;
  agencyId: string;
  bookingReference: string;
  status: string;
  totalAmount: string;
  currencyCode: string;
  createdAt: Date;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toRecentBookingSummary(booking: Booking): RecentBookingSummary {
  return {
    id: booking.id,
    agencyId: booking.tenantId,
    bookingReference: booking.bookingReference,
    status: booking.status,
    totalAmount: booking.totalAmount.toString(),
    currencyCode: booking.currencyCode,
    createdAt: booking.createdAt,
  };
}

// Dashboard (MASTER.md §6 module #2, TASKS.md T48) is deliberately a thin composition
// layer over Reports/Booking — no new data source, no aggregate root of its own
// (UI_GUIDELINES §10). It reuses ReportsService directly so its KPI figures are
// guaranteed identical to the Reports page for the same period, rather than recomputing
// them a second way.
@Injectable()
export class DashboardService {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async getSummary() {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodStartIso = periodStart.toISOString();

    const [sales, outstanding, bookingsThisPeriod, completedThisPeriod, recentBookings] = await Promise.all([
      this.reportsService.getSales({ createdAfter: periodStartIso }),
      this.reportsService.getOutstanding({}),
      this.bookingRepository.count({ createdAt: { gte: periodStart } }),
      this.bookingRepository.count({ status: 'completed', createdAt: { gte: periodStart } }),
      this.bookingRepository.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }) as Promise<Booking[]>,
    ]);

    return {
      periodStart: periodStartIso,
      currencyCode: sales.currencyCode,
      bookingsThisPeriod,
      completedThisPeriod,
      revenue: sales.totalSales,
      outstanding: outstanding.totalOutstanding,
      recentBookings: recentBookings.map(toRecentBookingSummary),
    };
  }
}
