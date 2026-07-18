'use client';

import { CustomerResponse } from '../../lib/api-client';

interface CustomerTableProps {
  customers: CustomerResponse[];
  onEdit: (customer: CustomerResponse) => void;
}

export function CustomerTable({ customers, onEdit }: CustomerTableProps) {
  if (customers.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-600">No customers found.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500">
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Email</th>
          <th className="py-2 pr-4 font-medium">Phone</th>
          <th className="py-2 pr-4 font-medium">Passport</th>
          <th className="py-2 pr-4 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id} className="border-b border-neutral-100">
            <td className="py-2 pr-4 text-neutral-900">{customer.fullName}</td>
            <td className="py-2 pr-4 text-neutral-700">{customer.email ?? '—'}</td>
            <td className="py-2 pr-4 text-neutral-700">{customer.phone ?? '—'}</td>
            <td className="py-2 pr-4 font-mono text-neutral-700">
              {customer.passportNumber ?? '—'}
            </td>
            <td className="py-2 pr-4 text-right">
              <button
                type="button"
                aria-label={`Edit ${customer.fullName}`}
                onClick={() => onEdit(customer)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
