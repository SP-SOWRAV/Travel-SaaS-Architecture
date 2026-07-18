import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { AirportController } from './airport.controller';
import { AirportRepository } from './airport.repository';
import { AirportService } from './airport.service';

@Module({
  imports: [CoreModule],
  controllers: [AirportController],
  providers: [AirportService, AirportRepository],
})
export class AirportModule {}
