import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { StatusVisita } from '@prisma/client';

export class CreateVisitaDto {
  @IsUUID()
  consultorId: string;

  @IsUUID()
  empresaId: string;

  @IsDateString()
  inicio: string;

  @IsDateString()
  fim: string;

  @IsString()
  @IsNotEmpty()
  tipoServico: string;

  @IsOptional()
  @IsEnum(StatusVisita)
  status?: StatusVisita;

  @IsOptional()
  @IsString()
  documentoUrl?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
