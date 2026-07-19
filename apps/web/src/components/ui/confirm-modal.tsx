'use client';

import { ReactNode, useState } from 'react';
import { ApiRequestError } from '../../lib/api-client';

interface ConfirmModalProps {
  title: string;
  description?: string;
  confirmLabel: string;
  busyLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  confirmDisabled?: boolean;
  children?: ReactNode;
}

// Shared destructive-action modal (UI_GUIDELINES §15, audit hardening) — no backdrop/Escape
// dismiss, requires an explicit button click to confirm, names the specific record in its
// title. Replaces the inline "expands below the buttons" pattern previously used for Cancel
// Booking and Process Refund, which had no backdrop and could be scrolled away from
// accidentally. `children` carries any action-specific fields (a cancel reason, a refund
// amount) between the description and the confirm/cancel buttons.
export function ConfirmModal({
  title,
  description,
  confirmLabel,
  busyLabel,
  onCancel,
  onConfirm,
  confirmDisabled,
  children,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Action failed');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">{title}</h2>
        {description && <p className="mb-4 text-sm text-neutral-600">{description}</p>}

        {error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {children && <div className="mb-4">{children}</div>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || confirmDisabled}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
