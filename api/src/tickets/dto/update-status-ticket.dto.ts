import { IsEnum } from 'class-validator';
import { StatusTicket } from '@prisma/client';

export class UpdateStatusTicketDto {
  @IsEnum(StatusTicket)
  status: StatusTicket;
}
