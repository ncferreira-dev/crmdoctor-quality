import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { StatusTarefa } from '@prisma/client';

export class CreateTarefaDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsUUID()
  responsavelId: string;

  @IsOptional()
  @IsUUID()
  projetoId?: string;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @IsEnum(StatusTarefa)
  status?: StatusTarefa;
}
