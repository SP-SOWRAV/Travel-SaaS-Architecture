import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const REMARK_TYPES = ['internal', 'customer_facing'] as const;

export class CreateRemarkDto {
  @IsOptional()
  @IsIn(REMARK_TYPES)
  remarkType?: (typeof REMARK_TYPES)[number];

  @IsString()
  @MinLength(1)
  remarkText!: string;
}
