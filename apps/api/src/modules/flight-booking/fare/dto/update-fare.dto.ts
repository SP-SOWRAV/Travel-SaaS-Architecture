import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateFareDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount?: number;
}
