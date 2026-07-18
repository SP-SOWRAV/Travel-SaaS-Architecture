import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateFareDto {
  @IsUUID()
  passengerId!: string;

  @IsUUID()
  sectorId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount!: number;
}
