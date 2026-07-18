import { IsUUID } from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  passengerId!: string;
}
