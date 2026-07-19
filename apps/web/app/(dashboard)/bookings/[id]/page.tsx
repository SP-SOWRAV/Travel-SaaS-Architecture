'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BookingAggregateResponse,
  WorkflowTransitionResponse,
  getBookingAggregate,
  getBookingTransitions,
} from '../../../../src/lib/api-client';
import { useAuth } from '../../../../src/lib/auth-context';
import { StatusActions } from '../../../../src/components/bookings/status-actions';
import { StatusBadge } from '../../../../src/components/bookings/status-badge';
import { TransitionHistory } from '../../../../src/components/bookings/transition-history';
import { FinancePanel } from '../../../../src/components/finance/finance-panel';
import { Skeleton } from '../../../../src/components/ui/skeleton';

export default function BookingDetailPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingAggregateResponse | null>(null);
  const [transitions, setTransitions] = useState<WorkflowTransitionResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  const loadTransitions = useCallback(() => {
    if (!accessToken || !params.id) {
      return;
    }
    getBookingTransitions(accessToken, params.id).then(setTransitions).catch(() => undefined);
  }, [accessToken, params.id]);

  const loadBooking = useCallback(() => {
    if (!accessToken || !params.id) {
      return;
    }
    getBookingAggregate(accessToken, params.id)
      .then(setBooking)
      .catch(() => setLoadError('Failed to load booking'));
  }, [accessToken, params.id]);

  useEffect(() => {
    loadBooking();
    loadTransitions();
  }, [loadBooking, loadTransitions]);

  // Status action buttons call this after a successful transition — updates the visible
  // status and appends a history entry entirely client-side, no full page reload
  // (TASKS.md T40 acceptance criteria).
  const handleStatusUpdated = (updated: BookingAggregateResponse) => {
    setBooking(updated);
    loadTransitions();
  };

  // Finance actions (T45: generate invoice, record payment, process refund) can silently
  // move the booking's own status via the Workflow Engine — refresh both the booking and
  // its transition history the same way status actions already do (T40 pattern above).
  const handleFinanceChanged = () => {
    loadBooking();
    loadTransitions();
  };

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

        {!booking && !loadError && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <Skeleton className="mb-3 h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <Skeleton className="mb-3 h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        )}

        {booking && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900">{booking.bookingReference}</h1>
              <StatusBadge status={booking.status} />
            </div>

            {accessToken && (
              <div className="mb-6">
                <StatusActions accessToken={accessToken} booking={booking} onUpdated={handleStatusUpdated} />
              </div>
            )}

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
              <div className="overflow-x-auto">
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
            </div>

            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Sectors ({booking.sectors.length})
              </h2>
              <div className="overflow-x-auto">
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
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Fares & Taxes ({booking.fares.length})
              </h2>
              <div className="overflow-x-auto">
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
            </div>

            {accessToken && (
              <div className="mt-6">
                <FinancePanel
                  accessToken={accessToken}
                  bookingId={booking.id}
                  bookingStatus={booking.status}
                  currencyCode={booking.currencyCode}
                  onBookingChanged={handleFinanceChanged}
                />
              </div>
            )}

            <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">Transition History</h2>
              <TransitionHistory transitions={transitions} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
