'use client';

import { useState } from 'react';
import { ApiRequestError } from '../../lib/api-client';

interface DeleteBranchModalProps {
  branchName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

// Destructive modal (UI_GUIDELINES §15): no backdrop/Escape dismiss, names the specific
// record, requires an explicit button click to confirm.
export function DeleteBranchModal({ branchName, onCancel, onConfirm }: DeleteBranchModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to delete branch');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">Delete branch {branchName}?</h2>
        <p className="mb-4 text-sm text-neutral-600">This action cannot be undone.</p>

        {error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
