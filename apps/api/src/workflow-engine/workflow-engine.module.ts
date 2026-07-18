import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { TransitionHistoryService } from './transition-history.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Module({
  imports: [CoreModule],
  providers: [WorkflowEngineService, TransitionHistoryService],
  exports: [WorkflowEngineService, TransitionHistoryService],
})
export class WorkflowEngineModule {}
