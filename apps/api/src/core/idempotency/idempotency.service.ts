import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const TTL_HOURS = 24;

// API_RULES §16's writer/reader — a plain, tenant-scoped table lookup by (tenantId, key),
// not routed through BaseRepository since it's core cross-cutting infrastructure written
// to by the interceptor, not a business module's own aggregate.
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async find(tenantId: string, key: string): Promise<{ statusCode: number; responseBody: unknown } | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (!existing || existing.expiresAt < new Date()) {
      return null;
    }
    return { statusCode: existing.statusCode, responseBody: existing.responseBody };
  }

  async store(tenantId: string, key: string, statusCode: number, responseBody: unknown): Promise<void> {
    const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
    await this.prisma.idempotencyKey.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: {
        tenantId,
        key,
        statusCode,
        responseBody: responseBody as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        statusCode,
        responseBody: responseBody as Prisma.InputJsonValue,
        expiresAt,
      },
    });
  }
}
