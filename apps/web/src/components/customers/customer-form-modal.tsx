'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ApiRequestError,
  CreateCustomerInput,
  CustomerResponse,
  UpdateCustomerInput,
} from '../../lib/api-client';
import { extractFieldErrors } from '../../lib/field-errors';
import { FieldError } from '../ui/field-error';

interface CustomerFormModalProps {
  customer: CustomerResponse | null; // null = create mode
  onClose: () => void;
  onSubmit: (data: CreateCustomerInput | UpdateCustomerInput) => Promise<void>;
}

export function CustomerFormModal({ customer, onClose, onSubmit }: CustomerFormModalProps) {
  const [fullName, setFullName] = useState(customer?.fullName ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [passportNumber, setPassportNumber] = useState(customer?.passportNumber ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(customer?.dateOfBirth ?? '');
  const [addressLine1, setAddressLine1] = useState(customer?.addressLine1 ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setFieldErrors({});
    setSaving(true);
    try {
      const payload: Record<string, string> = { fullName };
      if (email) {
        payload.email = email;
      }
      if (phone) {
        payload.phone = phone;
      }
      if (passportNumber) {
        payload.passportNumber = passportNumber;
      }
      if (dateOfBirth) {
        payload.dateOfBirth = dateOfBirth;
      }
      if (addressLine1) {
        payload.addressLine1 = addressLine1;
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to save customer');
      setFieldErrors(extractFieldErrors(err));
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
        aria-labelledby="customer-form-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="customer-form-title" className="mb-4 text-lg font-semibold text-neutral-900">
          {customer ? 'Edit Customer' : 'New Customer'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label
              className="mb-1 block text-sm font-medium text-neutral-700"
              htmlFor="customer-name"
            >
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              id="customer-name"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <FieldError message={fieldErrors.fullName} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-neutral-700"
                htmlFor="customer-email"
              >
                Email
              </label>
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-neutral-700"
                htmlFor="customer-phone"
              >
                Phone
              </label>
              <input
                id="customer-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <FieldError message={fieldErrors.phone} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-neutral-700"
                htmlFor="customer-passport"
              >
                Passport Number
              </label>
              <input
                id="customer-passport"
                type="text"
                value={passportNumber}
                onChange={(event) => setPassportNumber(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <FieldError message={fieldErrors.passportNumber} />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-neutral-700"
                htmlFor="customer-dob"
              >
                Date of Birth
              </label>
              <input
                id="customer-dob"
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <FieldError message={fieldErrors.dateOfBirth} />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-neutral-700"
              htmlFor="customer-address"
            >
              Address Line 1
            </label>
            <input
              id="customer-address"
              type="text"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <FieldError message={fieldErrors.addressLine1} />
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
