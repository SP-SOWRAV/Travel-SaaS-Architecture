import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { AirlineController } from './airline.controller';
import { AirlineRepository } from './airline.repository';
import { AirlineService } from './airline.service';

@Module({
  imports: [CoreModule],
  controllers: [AirlineController],
  providers: [AirlineService, AirlineRepository],
})
export class AirlineModule {}
