import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalRepository } from '../../core/repository/global.repository';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AirportRepository extends GlobalRepository<Prisma.AirportDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma.airport);
  }
}
