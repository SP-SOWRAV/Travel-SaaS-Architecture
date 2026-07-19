import { BadRequestException, Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { ReportDateRange, ReportsRepository } from './reports.repository';

interface DateFilters {
  createdAfter?: string;
  createdBefore?: string;
  branchId?: string;
}

// API_RULES §18: date-range filters are full ISO 8601 timestamps, not bare dates.
function parseRange(filters: DateFilters): ReportDateRange {
  const parse = (value: string | undefined, field: string): Date | undefined => {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO 8601 timestamp`);
    }
    return parsed;
  };

  return {
    createdAfter: parse(filters.createdAfter, 'createdAfter'),
    createdBefore: parse(filters.createdBefore, 'createdBefore'),
    branchId: filters.branchId,
  };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly settingsService: SettingsService,
  ) {}

  // T46: total sales by period — invoiced amount within the range, broken down by the
  // Invoice's own document-level status (DATABASE.md §8), tenant + optional branch scoped.
  async getSales(filters: DateFilters) {
    const range = parseRange(filters);
    const settings = await this.settingsService.getSettings();
    const invoices = await this.reportsRepository.findInvoicesInRange(range);

    const byStatus = new Map<string, { count: number; total: number }>();
    let totalSales = 0;
    let totalSubtotal = 0;
    let totalTax = 0;

    for (const invoice of invoices) {
      const total = Number(invoice.totalAmount);
      totalSales += total;
      totalSubtotal += Number(invoice.subtotalAmount);
      totalTax += Number(invoice.taxAmount);

      const bucket = byStatus.get(invoice.status) ?? { count: 0, total: 0 };
      bucket.count += 1;
      bucket.total += total;
      byStatus.set(invoice.status, bucket);
    }

    return {
      currencyCode: settings.currencyCode,
      invoiceCount: invoices.length,
      totalSales: totalSales.toFixed(2),
      totalSubtotal: totalSubtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      byStatus: Array.from(byStatus.entries()).map(([status, bucket]) => ({
        status,
        count: bucket.count,
        total: bucket.total.toFixed(2),
      })),
    };
  }

  // T46: outstanding invoices — issued/partially_paid invoices with their remaining
  // balance (total minus payments received so far), tenant + optional branch scoped.
  async getOutstanding(filters: DateFilters) {
    const range = parseRange(filters);
    const settings = await this.settingsService.getSettings();
    const invoices = await this.reportsRepository.findInvoicesInRange(range);

    const outstanding = invoices
      .filter((invoice) => invoice.status === 'issued' || invoice.status === 'partially_paid')
      .map((invoice) => {
        const totalAmount = Number(invoice.totalAmount);
        const paidAmount = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const outstandingAmount = totalAmount - paidAmount;
        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          bookingId: invoice.bookingId,
          bookingReference: invoice.booking.bookingReference,
          status: invoice.status,
          totalAmount: totalAmount.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          outstandingAmount: outstandingAmount.toFixed(2),
        };
      });

    const totalOutstanding = outstanding.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount), 0);

    return {
      currencyCode: settings.currencyCode,
      totalOutstanding: totalOutstanding.toFixed(2),
      invoices: outstanding,
    };
  }

  // T46: bookings per agent — count and total booking value grouped by the staff member
  // who created each booking, tenant + optional branch scoped.
  async getAgentPerformance(filters: DateFilters) {
    const range = parseRange(filters);
    const settings = await this.settingsService.getSettings();
    const bookings = await this.reportsRepository.findBookingsInRange(range);

    const byAgent = new Map<string, { agentName: string; bookingCount: number; totalSales: number }>();
    for (const booking of bookings) {
      const bucket = byAgent.get(booking.agentId) ?? {
        agentName: booking.agent.fullName,
        bookingCount: 0,
        totalSales: 0,
      };
      bucket.bookingCount += 1;
      bucket.totalSales += Number(booking.totalAmount);
      byAgent.set(booking.agentId, bucket);
    }

    return {
      currencyCode: settings.currencyCode,
      agents: Array.from(byAgent.entries()).map(([agentId, bucket]) => ({
        agentId,
        agentName: bucket.agentName,
        bookingCount: bucket.bookingCount,
        totalSales: bucket.totalSales.toFixed(2),
      })),
    };
  }
}
