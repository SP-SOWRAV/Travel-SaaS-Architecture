'use client';

import { useState } from 'react';
import { processRefund, RefundResponse } from '../../lib/api-client';
import { useIdempotencyKey } from '../../lib/idempotency-key';
import { ConfirmModal } from '../ui/confirm-modal';

interface RefundFormProps {
  accessToken: string;
  invoiceId: string;
  invoiceNumber: string;
  available: number;
  currencyCode: string;
  onProcessed: (refund: RefundResponse) => void;
  onCancel: () => void;
}

// Destructive/high-consequence action (UI_GUIDELINES §15): shared modal, no backdrop/Escape
// dismiss, names the specific invoice being refunded.
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
  const idempotencyKey = useIdempotencyKey();

  const parsedAmount = Number(amount);
  const canConfirm = parsedAmount > 0 && reason.trim().length > 0;

  const handleConfirm = async () => {
    const refund = await processRefund(
      accessToken,
      invoiceId,
      { amount: parsedAmount, reason: reason.trim() },
      idempotencyKey.getKey(),
    );
    idempotencyKey.resetKey();
    onProcessed(refund);
  };

  return (
    <ConfirmModal
      title={`Process refund for invoice ${invoiceNumber}?`}
      description="This action cannot be undone."
      confirmLabel="Confirm Refund"
      busyLabel="Processing…"
      confirmDisabled={!canConfirm}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
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

      <div>
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
    </ConfirmModal>
  );
}
