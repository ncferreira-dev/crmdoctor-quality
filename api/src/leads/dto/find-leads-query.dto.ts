import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstagioLead, Segmento } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindLeadsQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(EstagioLead)
  estagio?: EstagioLead;

  @IsOptional()
  @IsEnum(Segmento)
  segmento?: Segmento;

  @IsOptional()
  @IsString()
  busca?: string;
}
