import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConsultorDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  especialidade: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
