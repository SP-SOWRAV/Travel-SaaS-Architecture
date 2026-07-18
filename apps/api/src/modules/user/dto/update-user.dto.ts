import { UserRole } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const STAFF_ROLES = [UserRole.agency_admin, UserRole.branch_manager, UserRole.agent] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: (typeof STAFF_ROLES)[number];

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
