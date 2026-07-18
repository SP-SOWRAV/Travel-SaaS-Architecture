'use client';

import { WorkflowTransitionResponse } from '../../lib/api-client';
import { StatusBadge } from './status-badge';

interface TransitionHistoryProps {
  transitions: WorkflowTransitionResponse[];
}

export function TransitionHistory({ transitions }: TransitionHistoryProps) {
  if (transitions.length === 0) {
    return <p className="text-sm text-neutral-600">No transitions yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {transitions.map((transition) => (
        <li key={transition.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">{new Date(transition.createdAt).toLocaleString()}</span>
          {transition.fromStage && <StatusBadge status={transition.fromStage} />}
          {transition.fromStage && <span className="text-neutral-400">→</span>}
          <StatusBadge status={transition.toStage} />
          {transition.reason && <span className="text-neutral-600">({transition.reason})</span>}
        </li>
      ))}
    </ol>
  );
}
