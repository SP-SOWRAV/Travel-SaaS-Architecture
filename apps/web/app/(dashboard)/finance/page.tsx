'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookingSummaryResponse, InvoiceResponse, listBookings, listInvoices } from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { InvoiceStatusBadge } from '../../../src/components/finance/invoice-status-badge';

const STATUS_OPTIONS = ['issued', 'partially_paid', 'paid', 'void'];

// Standalone, read-only Finance overview (TASKS.md T45) — reuses the standard list/table
// pattern (UI_GUIDELINES §12); the actions themselves (generate/pay/refund) live on the
// Booking detail page's FinancePanel, reached via each row's booking reference link.
export default function FinancePage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [bookings, setBookings] = useState<BookingSummaryResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listBookings(accessToken).then(setBookings).catch(() => undefined);
  }, [accessToken]);

  const load = useCallback(() => {
    if (!accessToken) {
      return;
    }
    listInvoices(accessToken, { status: statusFilter || undefined })
      .then(setInvoices)
      .catch(() => setLoadError('Failed to load invoices'));
  }, [accessToken, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const bookingReference = (bookingId: string) =>
    bookings.find((booking) => booking.id === bookingId)?.bookingReference ?? '—';

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Finance</h1>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-medium">Invoice Number</th>
                <th className="py-2 pr-4 font-medium">Booking</th>
                <th className="py-2 pr-4 text-center font-medium">Status</th>
                <th className="py-2 pr-4 text-right font-medium">Total</th>
                <th className="py-2 pr-4 font-medium">Issued</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono text-neutral-900">{invoice.invoiceNumber}</td>
                  <td className="py-2 pr-4 font-mono text-neutral-700">
                    <Link href={`/bookings/${invoice.bookingId}`} className="text-blue-600 hover:text-blue-700">
                      {bookingReference(invoice.bookingId)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="py-2 pr-4 text-right text-neutral-700">
                    {invoice.totalAmount} {invoice.currencyCode}
                  </td>
                  <td className="py-2 pr-4 text-neutral-700">{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-600">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
