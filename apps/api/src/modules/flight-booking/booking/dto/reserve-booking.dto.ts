import { IsOptional, IsString } from 'class-validator';

export class ReserveBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
