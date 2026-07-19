import { isValidWorkflowTransition, WorkflowStage } from '@project/shared-types';

// Unit tests for the single source of truth for booking lifecycle (MASTER.md §5) — the
// adjacency map every Workflow Engine call is validated against. Production Hardening,
// Critical finding: "zero automated tests exist anywhere in the repository."
describe('isValidWorkflowTransition', () => {
  it('allows the primary linear path, one stage at a time', () => {
    expect(isValidWorkflowTransition(WorkflowStage.Draft, WorkflowStage.Reserved)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.Reserved, WorkflowStage.TicketIssued)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.TicketIssued, WorkflowStage.Invoiced)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.Invoiced, WorkflowStage.Paid)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.Paid, WorkflowStage.Completed)).toBe(true);
  });

  it('rejects skipping a stage in the primary path', () => {
    expect(isValidWorkflowTransition(WorkflowStage.Draft, WorkflowStage.TicketIssued)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.Draft, WorkflowStage.Paid)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.Reserved, WorkflowStage.Invoiced)).toBe(false);
  });

  it('allows Cancelled only from a pre-payment stage', () => {
    expect(isValidWorkflowTransition(WorkflowStage.Draft, WorkflowStage.Cancelled)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.Reserved, WorkflowStage.Cancelled)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.TicketIssued, WorkflowStage.Cancelled)).toBe(true);
  });

  it('rejects Cancelled from any post-payment stage', () => {
    expect(isValidWorkflowTransition(WorkflowStage.Invoiced, WorkflowStage.Cancelled)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.Paid, WorkflowStage.Cancelled)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.Completed, WorkflowStage.Cancelled)).toBe(false);
  });

  it('allows Refunded only from a post-payment stage', () => {
    expect(isValidWorkflowTransition(WorkflowStage.Paid, WorkflowStage.Refunded)).toBe(true);
    expect(isValidWorkflowTransition(WorkflowStage.Completed, WorkflowStage.Refunded)).toBe(true);
  });

  it('rejects Refunded from any pre-payment stage', () => {
    expect(isValidWorkflowTransition(WorkflowStage.Draft, WorkflowStage.Refunded)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.Reserved, WorkflowStage.Refunded)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.TicketIssued, WorkflowStage.Refunded)).toBe(false);
    expect(isValidWorkflowTransition(WorkflowStage.Invoiced, WorkflowStage.Refunded)).toBe(false);
  });

  it('treats Cancelled and Refunded as terminal — no outgoing transitions', () => {
    for (const target of Object.values(WorkflowStage)) {
      expect(isValidWorkflowTransition(WorkflowStage.Cancelled, target)).toBe(false);
      expect(isValidWorkflowTransition(WorkflowStage.Refunded, target)).toBe(false);
    }
  });

  it('never allows a transition back to the same stage', () => {
    for (const stage of Object.values(WorkflowStage)) {
      expect(isValidWorkflowTransition(stage, stage)).toBe(false);
    }
  });
});
