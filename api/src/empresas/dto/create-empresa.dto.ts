import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Segmento } from '@prisma/client';

export class CreateEmpresaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsEnum(Segmento)
  segmento: Segmento;

  @IsOptional()
  @IsString()
  contatoNome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
