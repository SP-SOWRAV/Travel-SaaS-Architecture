import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { MyProfileService } from './my-profile.service';

// API_RULES §13: a user may always read/update their own record — identity check
// (userId from JWT), not a role check, so only JwtAuthGuard applies here.
@Controller('api/v1/me')
@UseGuards(JwtAuthGuard)
export class MyProfileController {
  constructor(private readonly myProfileService: MyProfileService) {}

  @Get()
  async getMe() {
    const me = await this.myProfileService.getMe();
    return { data: me, meta: {} };
  }

  @Patch()
  async updateMe(@Body() dto: UpdateMyProfileDto) {
    const me = await this.myProfileService.updateMe(dto);
    return { data: me, meta: {} };
  }

  @Patch('password')
  @HttpCode(200)
  async changePassword(@Body() dto: ChangePasswordDto) {
    await this.myProfileService.changePassword(dto);
    return { data: { success: true }, meta: {} };
  }
}
