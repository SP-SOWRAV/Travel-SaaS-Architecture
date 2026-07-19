'use client';

import { useState } from 'react';
import { ApiRequestError, processRefund, RefundResponse } from '../../lib/api-client';

interface RefundFormProps {
  accessToken: string;
  invoiceId: string;
  invoiceNumber: string;
  available: number;
  currencyCode: string;
  onProcessed: (refund: RefundResponse) => void;
  onCancel: () => void;
}

// Destructive/high-consequence action (UI_GUIDELINES §15): explicit confirm required,
// names the specific invoice being refunded, no accidental dismiss.
export function RefundForm({
  accessToken,
  invoiceId,
  invoiceNumber,
  available,
  currencyCode,
  onProcessed,
  onCancel,
}: RefundFormProps) {
  const [amount, setAmount] = useState(available.toFixed(2));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required to process a refund');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const refund = await processRefund(accessToken, invoiceId, {
        amount: parsedAmount,
        reason: reason.trim(),
      });
      onProcessed(refund);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to process refund');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mb-3 text-sm font-medium text-neutral-800">
        Process refund for invoice {invoiceNumber}?
      </p>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="refund-amount">
          Amount ({currencyCode}) <span className="text-red-600">*</span>
        </label>
        <input
          id="refund-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-500">Available to refund: {available.toFixed(2)} {currencyCode}</p>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="refund-reason">
          Reason <span className="text-red-600">*</span>
        </label>
        <input
          id="refund-reason"
          type="text"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !reason.trim()}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? 'Processing…' : 'Confirm Refund'}
        </button>
      </div>
    </div>
  );
}
