'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookingAggregateResponse, getBookingAggregate } from '../../../../src/lib/api-client';
import { useAuth } from '../../../../src/lib/auth-context';
import { StatusBadge } from '../../../../src/components/bookings/status-badge';

export default function BookingDetailPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingAggregateResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken || !params.id) {
      return;
    }
    getBookingAggregate(accessToken, params.id)
      .then(setBooking)
      .catch(() => setLoadError('Failed to load booking'));
  }, [accessToken, params.id]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        {!booking && !loadError && <p className="text-sm text-neutral-600">Loading…</p>}

        {booking && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900">{booking.bookingReference}</h1>
              <StatusBadge status={booking.status} />
            </div>

            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-neutral-500">Total Amount</dt>
                  <dd className="text-neutral-900">
                    {booking.totalAmount} {booking.currencyCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Created</dt>
                  <dd className="text-neutral-900">{new Date(booking.createdAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Passengers ({booking.passengers.length})
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.passengers.map((passenger) => (
                    <tr key={passenger.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 text-neutral-900">
                        {passenger.firstName} {passenger.lastName}
                      </td>
                      <td className="py-2 pr-4 text-neutral-700">{passenger.passengerType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Sectors ({booking.sectors.length})
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-4 font-medium">Flight</th>
                    <th className="py-2 pr-4 font-medium">Cabin</th>
                    <th className="py-2 pr-4 font-medium">Departure</th>
                    <th className="py-2 pr-4 font-medium">Arrival</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.sectors.map((sector) => (
                    <tr key={sector.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 font-mono text-neutral-900">{sector.flightNumber}</td>
                      <td className="py-2 pr-4 text-neutral-700">{sector.cabinClass}</td>
                      <td className="py-2 pr-4 text-neutral-700">
                        {new Date(sector.departureAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-neutral-700">
                        {new Date(sector.arrivalAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Fares & Taxes ({booking.fares.length})
              </h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-4 font-medium">Base Amount</th>
                    <th className="py-2 pr-4 font-medium">Taxes</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.fares.map((fare) => (
                    <tr key={fare.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 text-neutral-900">
                        {fare.baseAmount} {fare.currencyCode}
                      </td>
                      <td className="py-2 pr-4 text-neutral-700">
                        {fare.taxes.map((tax) => `${tax.taxCode}: ${tax.amount}`).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
