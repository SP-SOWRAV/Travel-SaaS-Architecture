'use client';

import { AgentPerformanceResponse } from '../../lib/api-client';

export function AgentPerformanceReport({ report }: { report: AgentPerformanceResponse }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">Agent Performance</h2>

      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4 font-medium">Agent</th>
            <th className="py-2 pr-4 text-right font-medium">Bookings</th>
            <th className="py-2 pr-4 text-right font-medium">Total Sales</th>
          </tr>
        </thead>
        <tbody>
          {report.agents.map((agent) => (
            <tr key={agent.agentId} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-neutral-900">{agent.agentName}</td>
              <td className="py-2 pr-4 text-right text-neutral-700">{agent.bookingCount}</td>
              <td className="py-2 pr-4 text-right text-neutral-900">
                {agent.totalSales} {report.currencyCode}
              </td>
            </tr>
          ))}
          {report.agents.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-neutral-600">
                No bookings in this range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
