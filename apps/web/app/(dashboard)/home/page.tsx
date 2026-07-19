'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError, DashboardSummaryResponse, getDashboardSummary } from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { KpiCard } from '../../../src/components/dashboard/kpi-card';
import { RecentActivity } from '../../../src/components/dashboard/recent-activity';

// The real Dashboard (TASKS.md T48) — replaces the T13 placeholder at this same route.
// The login flow (T13) already sends every user to /home, so the Dashboard lives here
// rather than at a literal new (dashboard)/page.tsx, which would collide with the
// existing root app/page.tsx at "/" and be unreachable from the normal sign-in flow.
export default function DashboardPage() {
  const { accessToken, isAuthenticated, isInitializing, user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    getDashboardSummary(accessToken)
      .then(setSummary)
      .catch((err) => {
        setLoadError(
          err instanceof ApiRequestError && err.status === 403
            ? 'Dashboard KPIs are visible to Agency Admin and Branch Manager roles.'
            : 'Failed to load dashboard',
        );
      });
  }, [accessToken]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        </div>

        {loadError && (
          <p role="alert" className="mb-6 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">
            {loadError} (Signed in as: {user?.role})
          </p>
        )}

        {summary && (
          <>
            {/* 4 KPI cards, 4 cols at lg, 2 at md, 1 stacked below md (UI_GUIDELINES §10/§6). */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Bookings This Period" value={String(summary.bookingsThisPeriod)} />
              <KpiCard label="Revenue" value={summary.revenue} suffix={summary.currencyCode} />
              <KpiCard label="Outstanding" value={summary.outstanding} suffix={summary.currencyCode} />
              <KpiCard label="Completed This Period" value={String(summary.completedThisPeriod)} />
            </div>

            <RecentActivity bookings={summary.recentBookings} />
          </>
        )}

        {!summary && !loadError && <p className="text-sm text-neutral-600">Loading…</p>}
      </div>
    </main>
  );
}
