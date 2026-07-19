import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface RecordActivityInput {
  tenantId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
}

// The Activity Log's writer (MASTER.md module #14, DATABASE.md §3.21) — shared core
// infrastructure written to only by ActivityLogInterceptor, never directly by a business
// module (CODING_STANDARDS §15's own distinction: this is a business audit trail, not
// application/request logging). Append-only: no update/delete method exists.
@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordActivityInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress,
      },
    });
  }
}
