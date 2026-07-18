import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const CABIN_CLASSES = ['economy', 'premium_economy', 'business', 'first'] as const;

export class UpdateSectorDto {
  @IsOptional()
  @IsUUID()
  airlineId?: string;

  @IsOptional()
  @IsUUID()
  originAirportId?: string;

  @IsOptional()
  @IsUUID()
  destinationAirportId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  flightNumber?: string;

  @IsOptional()
  @IsIn(CABIN_CLASSES)
  cabinClass?: (typeof CABIN_CLASSES)[number];

  @IsOptional()
  @IsDateString()
  departureAt?: string;

  @IsOptional()
  @IsDateString()
  arrivalAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(32767)
  sequenceNumber?: number;
}
