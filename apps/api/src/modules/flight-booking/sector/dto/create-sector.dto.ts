import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const CABIN_CLASSES = ['economy', 'premium_economy', 'business', 'first'] as const;

export class CreateSectorDto {
  @IsUUID()
  airlineId!: string;

  @IsUUID()
  originAirportId!: string;

  @IsUUID()
  destinationAirportId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  flightNumber!: string;

  @IsOptional()
  @IsIn(CABIN_CLASSES)
  cabinClass?: (typeof CABIN_CLASSES)[number];

  @IsDateString()
  departureAt!: string;

  @IsDateString()
  arrivalAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(32767)
  sequenceNumber?: number;
}
