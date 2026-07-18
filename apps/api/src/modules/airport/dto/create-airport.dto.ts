import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateAirportDto {
  @IsUUID()
  cityId!: string;

  @IsString()
  @Length(3, 3)
  iataCode!: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  icaoCode?: string;

  @IsString()
  @Length(1, 255)
  name!: string;
}
