import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
