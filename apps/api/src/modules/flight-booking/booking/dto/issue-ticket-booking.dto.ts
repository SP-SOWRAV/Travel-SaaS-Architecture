import { IsOptional, IsString } from 'class-validator';

export class IssueTicketBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
