'use client';

import { useState } from 'react';
import { ApiRequestError, PaymentMethodCode, PaymentResponse, recordPayment } from '../../lib/api-client';

const PAYMENT_METHODS: { value: PaymentMethodCode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

interface PaymentFormProps {
  accessToken: string;
  invoiceId: string;
  remaining: number;
  currencyCode: string;
  onRecorded: (payment: PaymentResponse) => void;
  onCancel: () => void;
}

// Quick-create form (UI_GUIDELINES §15) — short enough not to need a full page.
export function PaymentForm({ accessToken, invoiceId, remaining, currencyCode, onRecorded, onCancel }: PaymentFormProps) {
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cash');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payment = await recordPayment(accessToken, invoiceId, {
        amount: parsedAmount,
        paymentMethod,
        reference: reference.trim() || undefined,
      });
      onRecorded(payment);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to record payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="payment-amount">
            Amount ({currencyCode}) <span className="text-red-600">*</span>
          </label>
          <input
            id="payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">Outstanding balance: {remaining.toFixed(2)} {currencyCode}</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="payment-method">
            Payment Method <span className="text-red-600">*</span>
          </label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodCode)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="payment-reference">
          Reference
        </label>
        <input
          id="payment-reference"
          type="text"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Transaction ID, cheque no., etc."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Recording…' : 'Record Payment'}
        </button>
      </div>
    </div>
  );
}
