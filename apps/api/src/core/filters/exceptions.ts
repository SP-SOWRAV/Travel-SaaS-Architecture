import { ConflictException } from '@nestjs/common';

// Typed business-rule exception (CODING_STANDARDS §14) whose response body already carries
// the exact API_RULES §7 envelope shape (code/message/details) — HttpExceptionFilter passes
// it straight through rather than guessing a generic code from the HTTP status.
//
// API_RULES §7: "details carries structured context when relevant (... allowed-transition
// list on a 409)". allowedTransitions is the target stages actually reachable from wherever
// the caller currently sits — thrown by WorkflowEngineService (the single source of the
// adjacency check, MASTER.md §5) and by any service that pre-validates the same transition
// before doing other work (T41 Invoice, T43 Refund — to avoid writing a row that a doomed
// transition would then reject, leaving an orphan).
export class InvalidWorkflowTransitionException extends ConflictException {
  constructor(message: string, allowedTransitions?: string[]) {
    super({
      code: 'INVALID_TRANSITION',
      message,
      details: allowedTransitions ? { allowedTransitions } : null,
    });
  }
}
