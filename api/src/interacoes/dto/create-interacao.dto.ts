import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoInteracao } from '@prisma/client';

export class CreateInteracaoDto {
  @IsEnum(TipoInteracao)
  tipo: TipoInteracao;

  @IsString()
  @IsNotEmpty()
  resumo: string;

  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsUUID()
  projetoId?: string;
}
