'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/lib/auth-context';
import { AirlinePicker } from '../../../src/components/reference-data/airline-picker';
import { AirportPicker } from '../../../src/components/reference-data/airport-picker';

export default function ReferenceDataPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'airlines' | 'airports'>('airlines');

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  if (isInitializing || !isAuthenticated || !accessToken) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Reference Data</h1>

        <div className="mb-6 flex gap-2 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setTab('airlines')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'airlines'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Airlines
          </button>
          <button
            type="button"
            onClick={() => setTab('airports')}
            className={`px-4 py-2 text-sm font-medium ${
              tab === 'airports'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Airports
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          {tab === 'airlines' ? (
            <AirlinePicker accessToken={accessToken} />
          ) : (
            <AirportPicker accessToken={accessToken} />
          )}
        </div>
      </div>
    </main>
  );
}
