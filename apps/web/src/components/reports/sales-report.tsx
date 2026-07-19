'use client';

import { SalesReportResponse } from '../../lib/api-client';
import { InvoiceStatusBadge } from '../finance/invoice-status-badge';

export function SalesReport({ report }: { report: SalesReportResponse }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">Sales</h2>

      <dl className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-neutral-500">Invoices</dt>
          <dd className="text-h1 text-2xl font-semibold text-neutral-900">{report.invoiceCount}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Total Sales</dt>
          <dd className="text-2xl font-semibold text-neutral-900">
            {report.totalSales} <span className="text-sm font-normal text-neutral-500">{report.currencyCode}</span>
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Subtotal</dt>
          <dd className="text-neutral-900">{report.totalSubtotal} {report.currencyCode}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Tax</dt>
          <dd className="text-neutral-900">{report.totalTax} {report.currencyCode}</dd>
        </div>
      </dl>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 text-center font-medium">Status</th>
            <th className="py-2 pr-4 text-right font-medium">Count</th>
            <th className="py-2 pr-4 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {report.byStatus.map((row) => (
            <tr key={row.status} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-center">
                <InvoiceStatusBadge status={row.status} />
              </td>
              <td className="py-2 pr-4 text-right text-neutral-700">{row.count}</td>
              <td className="py-2 pr-4 text-right text-neutral-900">{row.total} {report.currencyCode}</td>
            </tr>
          ))}
          {report.byStatus.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-neutral-600">
                No invoices in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
