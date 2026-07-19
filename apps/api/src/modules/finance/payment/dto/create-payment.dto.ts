import { IsIn, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'other'] as const;

export class CreatePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
