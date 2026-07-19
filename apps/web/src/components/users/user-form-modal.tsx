'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ApiRequestError,
  BranchResponse,
  CreateUserInput,
  StaffRole,
  UpdateUserInput,
  UserResponse,
} from '../../lib/api-client';
import { extractFieldErrors } from '../../lib/field-errors';
import { FieldError } from '../ui/field-error';

const STAFF_ROLES: StaffRole[] = ['agency_admin', 'branch_manager', 'agent'];

interface UserFormModalProps {
  user: UserResponse | null; // null = create mode
  branches: BranchResponse[];
  onClose: () => void;
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
}

export function UserFormModal({ user, branches, onClose, onSubmit }: UserFormModalProps) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [role, setRole] = useState<StaffRole>(user?.role ?? 'agent');
  const [branchId, setBranchId] = useState(user?.branchId ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
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
      if (user) {
        const payload: UpdateUserInput = { fullName, role };
        if (branchId) {
          payload.branchId = branchId;
        }
        if (phone) {
          payload.phone = phone;
        }
        await onSubmit(payload);
      } else {
        const payload: CreateUserInput = { email, password, fullName, role };
        if (branchId) {
          payload.branchId = branchId;
        }
        if (phone) {
          payload.phone = phone;
        }
        await onSubmit(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.apiError.message : 'Failed to save user');
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
        aria-labelledby="user-form-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="user-form-title" className="mb-4 text-lg font-semibold text-neutral-900">
          {user ? 'Edit Staff User' : 'New Staff User'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="user-fullname">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              id="user-fullname"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <FieldError message={fieldErrors.fullName} />
          </div>

          {!user && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="user-email">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <FieldError message={fieldErrors.email} />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-neutral-700"
                  htmlFor="user-password"
                >
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  id="user-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <FieldError message={fieldErrors.password} />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="user-role">
                Role <span className="text-red-600">*</span>
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(event) => setRole(event.target.value as StaffRole)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="user-branch">
                Branch
              </label>
              <select
                id="user-branch"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="">— None —</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="user-phone">
              Phone
            </label>
            <input
              id="user-phone"
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <FieldError message={fieldErrors.phone} />
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
