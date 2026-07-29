import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Segmento } from '@prisma/client';

export class FindEmpresasQueryDto {
  @IsOptional()
  @IsEnum(Segmento)
  segmento?: Segmento;

  @IsOptional()
  @IsString()
  busca?: string;
}
