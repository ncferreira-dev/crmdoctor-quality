import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompetenciaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
