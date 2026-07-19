'use client';

import { useState } from 'react';
import { WORKFLOW_TRANSITIONS, WorkflowStage } from '@project/shared-types';
import {
  ApiRequestError,
  BookingAggregateResponse,
  cancelBooking,
  issueTicketForBooking,
  reserveBooking,
} from '../../lib/api-client';
import { useIdempotencyKey } from '../../lib/idempotency-key';

interface StatusActionsProps {
  accessToken: string;
  booking: BookingAggregateResponse;
  onUpdated: (booking: BookingAggregateResponse) => void;
}

// Which actions are legal from the current stage comes from the single source of truth
// (shared-types' WORKFLOW_TRANSITIONS, TASKS.md T36) — never a UI-local copy of the rules.
export function StatusActions({ accessToken, booking, onUpdated }: StatusActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const reserveKey = useIdempotencyKey();
  const issueTicketKey = useIdempotencyKey();
  const cancelKey = useIdempotencyKey();

  const currentStage = booking.status as WorkflowStage;
  const allowedNext = WORKFLOW_TRANSITIONS[currentStage] ?? [];

  const canReserve = allowedNext.includes(WorkflowStage.Reserved);
  const canIssueTicket = allowedNext.includes(WorkflowStage.TicketIssued);
  const canCancel = allowedNext.includes(WorkflowStage.Cancelled);

  const runAction = async (
    action: string,
    keyHolder: ReturnType<typeof useIdempotencyKey>,
    fn: (key: string) => Promise<BookingAggregateResponse>,
  ) => {
    setError(null);
    setBusy(action);
    try {
      const updated = await fn(keyHolder.getKey());
      keyHolder.resetKey();
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      return;
    }
    setError(null);
    setBusy('cancel');
    try {
      const updated = await cancelBooking(accessToken, booking.id, cancelReason, cancelKey.getKey());
      cancelKey.resetKey();
      onUpdated(updated);
      setShowCancelForm(false);
      setCancelReason('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Cancel failed');
    } finally {
      setBusy(null);
    }
  };

  if (!canReserve && !canIssueTicket && !canCancel) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {canReserve && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => runAction('reserve', reserveKey, (key) => reserveBooking(accessToken, booking.id, undefined, key))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === 'reserve' ? 'Reserving…' : 'Reserve'}
          </button>
        )}
        {canIssueTicket && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              runAction('issue-ticket', issueTicketKey, (key) => issueTicketForBooking(accessToken, booking.id, undefined, key))
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === 'issue-ticket' ? 'Issuing…' : 'Issue Ticket'}
          </button>
        )}
        {canCancel && !showCancelForm && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setShowCancelForm(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Cancel Booking
          </button>
        )}
      </div>

      {/* Destructive action (UI_GUIDELINES §15): explicit confirm required, no accidental
          dismiss, names the specific record being cancelled. */}
      {showCancelForm && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="cancel-reason">
            Reason for cancelling {booking.bookingReference} <span className="text-red-600">*</span>
          </label>
          <input
            id="cancel-reason"
            type="text"
            required
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCancelForm(false)}
              disabled={busy !== null}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy !== null || !cancelReason.trim()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy === 'cancel' ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
