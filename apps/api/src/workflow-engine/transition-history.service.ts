import { Injectable } from '@nestjs/common';
import { BookingStatus, WorkflowTransition } from '@prisma/client';
import { WorkflowStage } from '@project/shared-types';
import { PrismaService } from '../core/database/prisma.service';

export interface RecordTransitionInput {
  bookingId: string;
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage;
  actorId: string | null;
  reason?: string;
}

// The Workflow Engine's audit trail writer (MASTER.md §5, DATABASE.md §3.14) — shared
// core infrastructure, not owned by any business module. Appends only; rows are never
// updated or deleted once written.
@Injectable()
export class TransitionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordTransitionInput): Promise<WorkflowTransition> {
    return this.prisma.workflowTransition.create({
      data: {
        bookingId: input.bookingId,
        fromStage: input.fromStage as BookingStatus | null,
        toStage: input.toStage as BookingStatus,
        actorId: input.actorId,
        reason: input.reason,
      },
    });
  }

  getHistory(bookingId: string): Promise<WorkflowTransition[]> {
    return this.prisma.workflowTransition.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
