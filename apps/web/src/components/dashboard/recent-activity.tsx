'use client';

import Link from 'next/link';
import { DashboardRecentBooking } from '../../lib/api-client';
import { StatusBadge } from '../bookings/status-badge';

// Reuses the standard Table pattern (UI_GUIDELINES §10/§12) — no dashboard-specific list
// style; this is a scoped-down view of the same Bookings list, not a new widget type.
export function RecentActivity({ bookings }: { bookings: DashboardRecentBooking[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">Recent Activity</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Reference</th>
            <th className="py-2 pr-4 text-center font-medium">Status</th>
            <th className="py-2 pr-4 text-right font-medium">Total</th>
            <th className="py-2 pr-4 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-neutral-900">
                <Link href={`/bookings/${booking.id}`} className="text-blue-600 hover:text-blue-700">
                  {booking.bookingReference}
                </Link>
              </td>
              <td className="py-2 pr-4 text-center">
                <StatusBadge status={booking.status} />
              </td>
              <td className="py-2 pr-4 text-right text-neutral-700">
                {booking.totalAmount} {booking.currencyCode}
              </td>
              <td className="py-2 pr-4 text-neutral-700">{new Date(booking.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-neutral-600">
                No bookings yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
