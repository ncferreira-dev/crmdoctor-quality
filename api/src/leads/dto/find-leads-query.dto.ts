import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstagioLead, Segmento } from '@prisma/client';

export class FindLeadsQueryDto {
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
