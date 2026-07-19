import { Injectable } from '@nestjs/common';
import { ActivityLog } from '@prisma/client';
import { ActivityLogRepository } from './activity-log.repository';

export interface ActivityLogResponse {
  id: string;
  agencyId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

// API_RULES §6/§20: tenant_id never appears on the wire — mapped to agencyId here, once.
function toActivityLogResponse(log: ActivityLog): ActivityLogResponse {
  const { tenantId, ...rest } = log;
  return { ...rest, agencyId: tenantId };
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async list(filters: { entityType?: string; action?: string }): Promise<ActivityLogResponse[]> {
    const where: Record<string, unknown> = {};
    if (filters.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    const logs = (await this.activityLogRepository.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })) as ActivityLog[];
    return logs.map(toActivityLogResponse);
  }
}
