'use client';

import { useEffect, useState } from 'react';
import { BranchResponse, CustomerResponse, listBranches, listCustomers } from '../../../lib/api-client';

interface StepCustomerProps {
  accessToken: string;
  customerId: string | null;
  branchId: string | null;
  onChange: (customerId: string | null, branchId: string | null) => void;
  onNext: () => void;
}

export function StepCustomer({ accessToken, customerId, branchId, onChange, onNext }: StepCustomerProps) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBranches(accessToken).then(setBranches).catch(() => setError('Failed to load branches'));
  }, [accessToken]);

  useEffect(() => {
    listCustomers(accessToken, query || undefined)
      .then(setCustomers)
      .catch(() => setError('Failed to load customers'));
  }, [accessToken, query]);

  const canProceed = !!customerId && !!branchId;

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="wizard-branch">
          Branch <span className="text-red-600">*</span>
        </label>
        <select
          id="wizard-branch"
          value={branchId ?? ''}
          onChange={(event) => onChange(customerId, event.target.value || null)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="">Select a branch…</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="wizard-customer-search">
          Customer <span className="text-red-600">*</span>
        </label>
        <input
          id="wizard-customer-search"
          type="text"
          placeholder="Search customers by name, email, or phone…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mb-3 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Phone</th>
              <th className="py-2 pr-4 text-right font-medium">Select</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4 text-neutral-900">{customer.fullName}</td>
                <td className="py-2 pr-4 text-neutral-700">{customer.email ?? '—'}</td>
                <td className="py-2 pr-4 text-neutral-700">{customer.phone ?? '—'}</td>
                <td className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => onChange(customer.id, branchId)}
                    className={`text-sm font-medium ${
                      customerId === customer.id ? 'text-green-700' : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    {customerId === customer.id ? 'Selected' : 'Select'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
