// Canonical Workflow Engine stages (MASTER.md §5) — the single source of truth for booking
// lifecycle state. No module may implement a parallel status enum for booking lifecycle;
// anything needing booking state reads it through the Workflow Engine (MASTER.md §13 rule 2).
export enum WorkflowStage {
  Draft = 'draft',
  Reserved = 'reserved',
  TicketIssued = 'ticket_issued',
  Invoiced = 'invoiced',
  Paid = 'paid',
  Completed = 'completed',
  Refunded = 'refunded',
  Cancelled = 'cancelled',
}

// Allowed-transition adjacency map (MASTER.md §5):
// - Primary path is strictly linear: Draft -> Reserved -> TicketIssued -> Invoiced -> Paid -> Completed.
// - Cancelled is reachable only from a pre-payment stage (Draft, Reserved, TicketIssued).
// - Refunded is reachable only from a post-payment stage (Paid or Completed).
export const WORKFLOW_TRANSITIONS: Record<WorkflowStage, WorkflowStage[]> = {
  [WorkflowStage.Draft]: [WorkflowStage.Reserved, WorkflowStage.Cancelled],
  [WorkflowStage.Reserved]: [WorkflowStage.TicketIssued, WorkflowStage.Cancelled],
  [WorkflowStage.TicketIssued]: [WorkflowStage.Invoiced, WorkflowStage.Cancelled],
  [WorkflowStage.Invoiced]: [WorkflowStage.Paid],
  [WorkflowStage.Paid]: [WorkflowStage.Completed, WorkflowStage.Refunded],
  [WorkflowStage.Completed]: [WorkflowStage.Refunded],
  [WorkflowStage.Refunded]: [],
  [WorkflowStage.Cancelled]: [],
};

export function isValidWorkflowTransition(from: WorkflowStage, to: WorkflowStage): boolean {
  return WORKFLOW_TRANSITIONS[from].includes(to);
}
