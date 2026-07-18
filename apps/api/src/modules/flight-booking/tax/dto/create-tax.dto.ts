import { IsNumber, IsOptional, IsString, Min, MinLength, MaxLength } from 'class-validator';

export class CreateTaxDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  taxCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}
