import { IsEnum } from 'class-validator';
import { EstagioProjeto } from '@prisma/client';

export class UpdateEstagioProjetoDto {
  @IsEnum(EstagioProjeto)
  estagio: EstagioProjeto;
}
