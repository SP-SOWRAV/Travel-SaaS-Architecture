import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { isValidWorkflowTransition, WORKFLOW_TRANSITIONS, WorkflowStage } from '@project/shared-types';
import { PrismaService } from '../core/database/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { InvalidWorkflowTransitionException } from '../core/filters/exceptions';
import { TransitionHistoryService } from './transition-history.service';

type PrismaTransactionClient = Prisma.TransactionClient;

// The Workflow Engine (MASTER.md §5) — the single service every booking/document status
// change goes through. Flight Booking and Finance are consumers of this, never independent
// owners of their own status logic (MASTER.md §13 rule 2), so the dependency direction is
// one-way: business modules call into workflow-engine, never the reverse. Tenant scoping is
// structural here too (T50 hardening) — the initial booking lookup is itself tenant-scoped
// via TenantContextService, rather than trusting that every current and future caller
// already verified ownership before invoking transition() (DEVELOPMENT_RULES §20 rule 2).
@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly transitionHistory: TransitionHistoryService,
  ) {}

  // H2 hardening: accepts the caller's transaction client (CODING_STANDARDS §5) so a
  // Finance operation that also drives a workflow transition — Payment recording,
  // Ticket issuance, Refund processing — commits the booking-status update and its
  // history row as one atomic unit with the Payment/Invoice/Refund row that prompted it,
  // rather than as separate, independently-committing statements. A crash between them
  // previously could leave e.g. a payment recorded but the booking still at its old
  // stage. Falls back to the plain client for a standalone transition call.
  async transition(
    bookingId: string,
    targetStage: WorkflowStage,
    actorId: string | null,
    reason?: string,
    tx?: PrismaTransactionClient,
  ): Promise<Booking> {
    const client = tx ?? this.prisma;
    const tenantId = this.tenantContext.requireTenantId();
    const booking = await client.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const currentStage = booking.status as unknown as WorkflowStage;

    if (!isValidWorkflowTransition(currentStage, targetStage)) {
      throw new InvalidWorkflowTransitionException(
        `Invalid workflow transition: '${currentStage}' -> '${targetStage}' is not allowed`,
        WORKFLOW_TRANSITIONS[currentStage],
      );
    }

    // DATABASE.md §3.14: reason is required for Cancelled/Refunded, optional otherwise.
    if ((targetStage === WorkflowStage.Cancelled || targetStage === WorkflowStage.Refunded) && !reason) {
      throw new BadRequestException(`A reason is required to transition to '${targetStage}'`);
    }

    const updated = await client.booking.update({
      where: { id: bookingId },
      data: { status: targetStage as unknown as BookingStatus },
    });

    await this.transitionHistory.record(
      {
        bookingId,
        fromStage: currentStage,
        toStage: targetStage,
        actorId,
        reason,
      },
      tx,
    );

    return updated;
  }
}
