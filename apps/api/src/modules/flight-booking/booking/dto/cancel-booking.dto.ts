import { IsString, MinLength } from 'class-validator';

// DATABASE.md §3.14: reason is required to Cancel (a pre-payment terminal transition).
export class CancelBookingDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
