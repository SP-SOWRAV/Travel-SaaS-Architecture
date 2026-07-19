'use client';

import Link from 'next/link';
import { OutstandingReportResponse } from '../../lib/api-client';
import { InvoiceStatusBadge } from '../finance/invoice-status-badge';

export function OutstandingReport({ report }: { report: OutstandingReportResponse }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">Outstanding</h2>

      <div className="mb-4">
        <span className="text-neutral-500">Total Outstanding: </span>
        <span className="text-2xl font-semibold text-neutral-900">
          {report.totalOutstanding} <span className="text-sm font-normal text-neutral-500">{report.currencyCode}</span>
        </span>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Invoice</th>
            <th className="py-2 pr-4 font-medium">Booking</th>
            <th className="py-2 pr-4 text-center font-medium">Status</th>
            <th className="py-2 pr-4 text-right font-medium">Total</th>
            <th className="py-2 pr-4 text-right font-medium">Paid</th>
            <th className="py-2 pr-4 text-right font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {report.invoices.map((invoice) => (
            <tr key={invoice.invoiceId} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-neutral-900">{invoice.invoiceNumber}</td>
              <td className="py-2 pr-4 font-mono text-neutral-700">
                <Link href={`/bookings/${invoice.bookingId}`} className="text-blue-600 hover:text-blue-700">
                  {invoice.bookingReference}
                </Link>
              </td>
              <td className="py-2 pr-4 text-center">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="py-2 pr-4 text-right text-neutral-700">{invoice.totalAmount}</td>
              <td className="py-2 pr-4 text-right text-neutral-700">{invoice.paidAmount}</td>
              <td className="py-2 pr-4 text-right font-medium text-neutral-900">{invoice.outstandingAmount}</td>
            </tr>
          ))}
          {report.invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-neutral-600">
                No outstanding invoices in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
