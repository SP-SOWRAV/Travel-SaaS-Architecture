import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { UserResponse, UserService } from '../user/user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Injectable()
export class MyProfileService {
  constructor(
    private readonly userService: UserService,
    private readonly tenantContext: TenantContextService,
  ) {}

  getMe(): Promise<UserResponse> {
    return this.userService.getById(this.tenantContext.requireUserId());
  }

  updateMe(dto: UpdateMyProfileDto): Promise<UserResponse> {
    return this.userService.update(this.tenantContext.requireUserId(), dto);
  }

  changePassword(dto: ChangePasswordDto): Promise<void> {
    return this.userService.changePassword(
      this.tenantContext.requireUserId(),
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
