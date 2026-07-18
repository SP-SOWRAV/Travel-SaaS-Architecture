import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { UserModule } from '../user/user.module';
import { MyProfileController } from './my-profile.controller';
import { MyProfileService } from './my-profile.service';

@Module({
  imports: [CoreModule, UserModule],
  controllers: [MyProfileController],
  providers: [MyProfileService],
})
export class MyProfileModule {}
