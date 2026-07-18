import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAirlineDto {
  @IsString()
  @Length(2, 2)
  iataCode!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  icaoCode?: string;

  @IsString()
  @Length(1, 255)
  name!: string;
}
