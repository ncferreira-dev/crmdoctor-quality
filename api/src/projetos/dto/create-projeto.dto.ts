import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProjetoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsDateString()
  dataLimiteCompliance?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valor?: number;

  @IsUUID()
  empresaId: string;

  // Quem toca o projeto. Uma pessoa é o responsável; duas ou mais são a equipe.
  // Lista vazia é legítima e significa "ainda sem gente definida", que é o
  // estado normal de um projeto recém-aberto em diagnóstico.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  equipeIds?: string[];
}
