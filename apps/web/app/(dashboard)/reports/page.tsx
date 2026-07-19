'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AgentPerformanceResponse,
  BranchResponse,
  OutstandingReportResponse,
  SalesReportResponse,
  getAgentPerformanceReport,
  getOutstandingReport,
  getSalesReport,
  listBranches,
} from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { SalesReport } from '../../../src/components/reports/sales-report';
import { OutstandingReport } from '../../../src/components/reports/outstanding-report';
import { AgentPerformanceReport } from '../../../src/components/reports/agent-performance-report';

// Date-range/branch filters (TASKS.md T47) render the three T46 aggregation endpoints.
// API_RULES §18 requires full ISO 8601 timestamps on the wire — the date inputs here are
// calendar dates for the user, converted to a day's start/end boundary at request time.
export default function ReportsPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [sales, setSales] = useState<SalesReportResponse | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingReportResponse | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceResponse | null>(null);
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
    listBranches(accessToken).then(setBranches).catch(() => undefined);
  }, [accessToken]);

  const load = useCallback(() => {
    if (!accessToken) {
      return;
    }
    const filters = {
      createdAfter: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
      createdBefore: dateTo ? `${dateTo}T23:59:59Z` : undefined,
      branchId: branchId || undefined,
    };
    setLoadError(null);
    Promise.all([
      getSalesReport(accessToken, filters),
      getOutstandingReport(accessToken, filters),
      getAgentPerformanceReport(accessToken, filters),
    ])
      .then(([salesData, outstandingData, agentData]) => {
        setSales(salesData);
        setOutstanding(outstandingData);
        setAgentPerformance(agentData);
      })
      .catch(() => setLoadError('Failed to load reports — this view requires an Agency Admin or Branch Manager role'));
  }, [accessToken, dateFrom, dateTo, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Reports</h1>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="report-date-from">
              From
            </label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="report-date-to">
              To
            </label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="report-branch">
              Branch
            </label>
            <select
              id="report-branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          {(dateFrom || dateTo || branchId) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setBranchId('');
              }}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Clear filters
            </button>
          )}
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="space-y-6">
          {sales && <SalesReport report={sales} />}
          {outstanding && <OutstandingReport report={outstanding} />}
          {agentPerformance && <AgentPerformanceReport report={agentPerformance} />}
        </div>
      </div>
    </main>
  );
}
