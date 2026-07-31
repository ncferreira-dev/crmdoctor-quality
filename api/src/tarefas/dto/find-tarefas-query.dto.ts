import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusTarefa } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindTarefasQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsUUID()
  projetoId?: string;

  @IsOptional()
  @IsEnum(StatusTarefa)
  status?: StatusTarefa;
}
