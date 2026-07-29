import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusTicket } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindTicketsQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
