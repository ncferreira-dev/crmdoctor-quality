import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Segmento } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindEmpresasQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(Segmento)
  segmento?: Segmento;

  @IsOptional()
  @IsString()
  busca?: string;
}
