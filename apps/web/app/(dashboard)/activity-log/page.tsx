'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityLogResponse, listActivityLog } from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';

// Read-only Activity Log list (TASKS.md T49) — reuses the standard table pattern
// (UI_GUIDELINES §12); rows are written automatically by the global
// ActivityLogInterceptor (core/activity-log), never by this page or its API calls.
export default function ActivityLogPage() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLogResponse[]>([]);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  const load = useCallback(() => {
    if (!accessToken) {
      return;
    }
    listActivityLog(accessToken, { entityType: entityType || undefined, action: action || undefined })
      .then(setLogs)
      .catch(() => setLoadError('Failed to load activity log'));
  }, [accessToken, entityType, action]);

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
          <h1 className="text-2xl font-semibold text-neutral-900">Activity Log</h1>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            placeholder="Filter by entity type (e.g. booking)"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <input
            type="text"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="Filter by action (e.g. booking.create)"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        {loadError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Entity Type</th>
                <th className="py-2 pr-4 font-medium">Entity ID</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono text-neutral-900">{log.action}</td>
                  <td className="py-2 pr-4 text-neutral-700">{log.entityType}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-neutral-500">{log.entityId}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-neutral-500">{log.actorId ?? '—'}</td>
                  <td className="py-2 pr-4 text-neutral-700">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-600">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
