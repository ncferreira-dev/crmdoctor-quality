import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstagioProjeto } from '@prisma/client';

export class FindProjetosQueryDto {
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsEnum(EstagioProjeto)
  estagio?: EstagioProjeto;
}
