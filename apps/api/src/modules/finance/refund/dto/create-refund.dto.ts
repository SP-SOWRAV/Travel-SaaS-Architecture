import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

// DATABASE.md §3.19: reason is a required NOT NULL column (also matches
// WorkflowEngineService's own rule that a Refunded transition always needs a reason).
export class CreateRefundDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsUUID()
  paymentId?: string;
}
