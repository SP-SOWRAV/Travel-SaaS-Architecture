import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '@prisma/client';
import { isValidWorkflowTransition, WorkflowStage } from '@project/shared-types';
import { PrismaService } from '../core/database/prisma.service';
import { TransitionHistoryService } from './transition-history.service';

// The Workflow Engine (MASTER.md §5) — the single service every booking/document status
// change goes through. Flight Booking and Finance are consumers of this, never independent
// owners of their own status logic (MASTER.md §13 rule 2), so the dependency direction is
// one-way: business modules call into workflow-engine, never the reverse. Tenant ownership
// of bookingId is the caller's responsibility (it already resolved the booking via its own
// tenant-scoped repository before invoking transition()).
@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transitionHistory: TransitionHistoryService,
  ) {}

  async transition(
    bookingId: string,
    targetStage: WorkflowStage,
    actorId: string | null,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const currentStage = booking.status as unknown as WorkflowStage;

    if (!isValidWorkflowTransition(currentStage, targetStage)) {
      throw new ConflictException(
        `Invalid workflow transition: '${currentStage}' -> '${targetStage}' is not allowed`,
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
