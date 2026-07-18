import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { BranchModule } from '../branch/branch.module';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [CoreModule, BranchModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
