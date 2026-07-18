import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { BranchController } from './branch.controller';
import { BranchRepository } from './branch.repository';
import { BranchService } from './branch.service';

@Module({
  imports: [CoreModule],
  controllers: [BranchController],
  providers: [BranchService, BranchRepository],
})
export class BranchModule {}
