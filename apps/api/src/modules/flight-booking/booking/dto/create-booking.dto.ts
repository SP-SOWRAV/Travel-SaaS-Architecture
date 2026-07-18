import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreatePassengerDto } from '../../passenger/dto/create-passenger.dto';
import { CreateSectorDto } from '../../sector/dto/create-sector.dto';

export class CreateBookingTaxDto {
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

// Passengers/sectors have no id yet inside a single aggregate-create request, so a fare
// references them by their position in the passengers/sectors arrays above.
export class CreateBookingFareDto {
  @IsInt()
  @Min(0)
  passengerIndex!: number;

  @IsInt()
  @Min(0)
  sectorIndex!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseAmount!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingTaxDto)
  taxes?: CreateBookingTaxDto[];
}

export class CreateBookingDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  branchId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePassengerDto)
  passengers!: CreatePassengerDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSectorDto)
  sectors!: CreateSectorDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingFareDto)
  fares?: CreateBookingFareDto[];
}
