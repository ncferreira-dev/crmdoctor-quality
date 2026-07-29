import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusTicket } from '@prisma/client';

export class FindTicketsQueryDto {
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
