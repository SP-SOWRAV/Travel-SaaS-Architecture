import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalRepository } from '../../core/repository/global.repository';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AirlineRepository extends GlobalRepository<Prisma.AirlineDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma.airline);
  }
}
