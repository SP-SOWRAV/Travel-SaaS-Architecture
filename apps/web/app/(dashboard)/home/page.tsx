'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/lib/auth-context';

// Placeholder authenticated landing route (TASKS.md T13). The real Dashboard module
// (KPI cards, etc.) is built in T48.
export default function DashboardPlaceholderPage() {
  const { isAuthenticated, isInitializing, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">You&apos;re signed in</h1>
        <p className="mt-2 text-sm text-neutral-600">Role: {user?.role}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="mt-6 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Log out
        </button>
      </div>
    </main>
  );
}
