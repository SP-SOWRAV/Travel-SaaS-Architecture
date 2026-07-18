'use client';

import { useState } from 'react';
import {
  ApiRequestError,
  CreateBookingAggregateInput,
  createBookingAggregate,
} from '../../../lib/api-client';

interface StepReviewProps {
  accessToken: string;
  input: CreateBookingAggregateInput;
  onBack: () => void;
  onCreated: (bookingId: string) => void;
}

export function StepReview({ accessToken, input, onBack, onCreated }: StepReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const booking = await createBookingAggregate(accessToken, input);
      onCreated(booking.id);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const fareTotal = input.fares?.reduce(
    (sum, fare) => sum + fare.baseAmount + (fare.taxes ?? []).reduce((s, t) => s + t.amount, 0),
    0,
  );

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-md border border-neutral-200 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Passengers ({input.passengers.length})</h3>
        <ul className="text-sm text-neutral-700">
          {input.passengers.map((p, index) => (
            <li key={index}>
              {p.firstName} {p.lastName} ({p.passengerType})
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-neutral-200 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Sectors ({input.sectors.length})</h3>
        <ul className="text-sm text-neutral-700">
          {input.sectors.map((s, index) => (
            <li key={index}>
              {s.flightNumber} — departs {s.departureAt}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-neutral-200 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">
          Fares ({input.fares?.length ?? 0}) — Total: {fareTotal ?? 0}
        </h3>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Booking'}
        </button>
      </div>
    </div>
  );
}
