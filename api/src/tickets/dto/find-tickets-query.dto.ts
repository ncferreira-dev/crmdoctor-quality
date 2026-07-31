import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusTicket } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { paraBoolean } from '../../common/transforms/para-boolean';

export class FindTicketsQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @Transform(paraBoolean)
  @IsBoolean()
  emAtraso?: boolean;
}
