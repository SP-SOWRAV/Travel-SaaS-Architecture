import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateAirlineDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  iataCode?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  icaoCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
