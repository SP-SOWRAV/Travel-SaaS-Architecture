import { UserRole } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// platform_admin is out of scope here: this endpoint always assigns the caller's tenantId
// (base repository, CODING_STANDARDS §4), and a Platform Admin account has no tenant.
const STAFF_ROLES = [UserRole.agency_admin, UserRole.branch_manager, UserRole.agent] as const;

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsIn(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
