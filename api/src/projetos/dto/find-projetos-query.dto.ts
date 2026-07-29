import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstagioProjeto } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindProjetosQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsEnum(EstagioProjeto)
  estagio?: EstagioProjeto;
}
