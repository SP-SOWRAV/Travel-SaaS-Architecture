import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database connectivity check failed');
    }

    return {
      data: { status: 'ok', database: 'up' },
      meta: {},
    };
  }
}
