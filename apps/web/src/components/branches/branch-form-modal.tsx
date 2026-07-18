'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ApiRequestError,
  BranchResponse,
  CreateBranchInput,
  UpdateBranchInput,
} from '../../lib/api-client';

interface BranchFormModalProps {
  branch: BranchResponse | null; // null = create mode
  onClose: () => void;
  onSubmit: (data: CreateBranchInput | UpdateBranchInput) => Promise<void>;
}

export function BranchFormModal({ branch, onClose, onSubmit }: BranchFormModalProps) {
  const [name, setName] = useState(branch?.name ?? '');
  const [code, setCode] = useState(branch?.code ?? '');
  const [addressLine1, setAddressLine1] = useState(branch?.addressLine1 ?? '');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [email, setEmail] = useState(branch?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Non-destructive modal: Escape closes it (UI_GUIDELINES §15).
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = { name, code };
      if (addressLine1) {
        payload.addressLine1 = addressLine1;
      }
      if (phone) {
        payload.phone = phone;
      }
      if (email) {
        payload.email = email;
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-form-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="branch-form-title" className="mb-4 text-lg font-semibold text-neutral-900">
          {branch ? 'Edit Branch' : 'New Branch'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="branch-name">
              Name <span className="text-red-600">*</span>
            </label>
            <input
              id="branch-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="branch-code">
              Code <span className="text-red-600">*</span>
            </label>
            <input
              id="branch-code"
              type="text"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm uppercase focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="branch-address">
              Address Line 1
            </label>
            <input
              id="branch-address"
              type="text"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="branch-phone">
                Phone
              </label>
              <input
                id="branch-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="branch-email">
                Email
              </label>
              <input
                id="branch-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
