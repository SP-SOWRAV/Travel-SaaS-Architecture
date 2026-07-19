import { Injectable } from '@nestjs/common';
import { BookingStatus, WorkflowTransition } from '@prisma/client';
import { WorkflowStage } from '@project/shared-types';
import { PrismaService } from '../core/database/prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

export interface RecordTransitionInput {
  bookingId: string;
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage;
  actorId: string | null;
  reason?: string;
}

// The Workflow Engine's audit trail writer (MASTER.md §5, DATABASE.md §3.14) — shared
// core infrastructure, not owned by any business module. Appends only; rows are never
// updated or deleted once written. WorkflowTransition carries no tenant_id column of its
// own (DATABASE.md §3.14, scoped via bookingId like Booking's other sub-entities), so
// getHistory's read is tenant-scoped structurally via a join through Booking (T50
// hardening) rather than trusting the caller already verified ownership — record()'s
// bookingId is always one WorkflowEngineService.transition() just verified in the same
// call, so it doesn't need its own separate check.
@Injectable()
export class TransitionHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

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
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.workflowTransition.findMany({
      where: { bookingId, booking: { tenantId } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
