'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookingSummaryResponse, BranchResponse, listBookings, listBranches } from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { StatusBadge } from '../../../src/components/bookings/status-badge';
import { TableSkeleton } from '../../../src/components/ui/skeleton';

const STATUS_OPTIONS = [
  'draft',
  'reserved',
  'ticket_issued',
  'invoiced',
  'paid',
  'completed',
  'refunded',
  'cancelled',
];

export default function BookingsPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingSummaryResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listBranches(accessToken).then(setBranches).catch(() => undefined);
  }, [accessToken]);

  const load = useCallback(() => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    listBookings(accessToken, {
      status: statusFilter || undefined,
      branchId: branchFilter || undefined,
    })
      .then(setBookings)
      .catch(() => setLoadError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, [accessToken, statusFilter, branchFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const branchName = (branchId: string) => branches.find((b) => b.id === branchId)?.name ?? '—';

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Bookings</h1>
          <Link
            href="/bookings/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Booking
          </Link>
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

          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
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
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-medium">Reference</th>
                <th className="py-2 pr-4 font-medium">Branch</th>
                <th className="py-2 pr-4 text-center font-medium">Status</th>
                <th className="py-2 pr-4 text-right font-medium">Total</th>
                <th className="py-2 pr-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton rows={5} columns={5} />}
              {!loading && bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono text-neutral-900">
                    <Link href={`/bookings/${booking.id}`} className="text-blue-600 hover:text-blue-700">
                      {booking.bookingReference}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-neutral-700">{branchName(booking.branchId)}</td>
                  <td className="py-2 pr-4 text-center">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="py-2 pr-4 text-right text-neutral-700">
                    {booking.totalAmount} {booking.currencyCode}
                  </td>
                  <td className="py-2 pr-4 text-neutral-700">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!loading && bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-600">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </main>
  );
}
