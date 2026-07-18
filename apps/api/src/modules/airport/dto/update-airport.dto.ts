import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateAirportDto {
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  iataCode?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  icaoCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
