import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Segmento } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  empresaNome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEnum(Segmento)
  segmento?: Segmento;

  @IsOptional()
  @IsString()
  origem?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
