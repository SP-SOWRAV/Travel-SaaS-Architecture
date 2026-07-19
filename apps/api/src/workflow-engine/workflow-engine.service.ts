import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '@prisma/client';
import { isValidWorkflowTransition, WORKFLOW_TRANSITIONS, WorkflowStage } from '@project/shared-types';
import { PrismaService } from '../core/database/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { InvalidWorkflowTransitionException } from '../core/filters/exceptions';
import { TransitionHistoryService } from './transition-history.service';

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

  async transition(
    bookingId: string,
    targetStage: WorkflowStage,
    actorId: string | null,
    reason?: string,
  ): Promise<Booking> {
    const tenantId = this.tenantContext.requireTenantId();
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
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

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: targetStage as unknown as BookingStatus },
    });

    await this.transitionHistory.record({
      bookingId,
      fromStage: currentStage,
      toStage: targetStage,
      actorId,
      reason,
    });

    return updated;
  }
}
