import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const PASSENGER_TYPES = ['ADT', 'CHD', 'INF'] as const;

export class UpdatePassengerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string;

  @IsOptional()
  @IsIn(PASSENGER_TYPES)
  passengerType?: (typeof PASSENGER_TYPES)[number];

  @IsOptional()
  @IsUUID()
  nationalityCountryId?: string;
}
