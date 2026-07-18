'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreateCustomerInput,
  CustomerResponse,
  UpdateCustomerInput,
  createCustomer,
  listCustomers,
  updateCustomer,
} from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { CustomerFormModal } from '../../../src/components/customers/customer-form-modal';
import { CustomerTable } from '../../../src/components/customers/customer-table';

export default function CustomersPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerResponse | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  const loadCustomers = useCallback(
    (q: string) => {
      if (!accessToken) {
        return;
      }
      listCustomers(accessToken, q || undefined)
        .then(setCustomers)
        .catch(() => setLoadError('Failed to load customers'));
    },
    [accessToken],
  );

  useEffect(() => {
    loadCustomers(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    loadCustomers(query);
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer: CustomerResponse) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleSave = useCallback(
    async (data: CreateCustomerInput | UpdateCustomerInput) => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      if (editingCustomer) {
        const updated = await updateCustomer(accessToken, editingCustomer.id, data);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCustomer(accessToken, data as CreateCustomerInput);
        setCustomers((prev) => [created, ...prev]);
      }
    },
    [accessToken, editingCustomer],
  );

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Customers</h1>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Customer
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Search
          </button>
        </form>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <CustomerTable customers={customers} onEdit={handleEdit} />
        </div>
      </div>

      {showForm && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => setShowForm(false)}
          onSubmit={handleSave}
        />
      )}
    </main>
  );
}
