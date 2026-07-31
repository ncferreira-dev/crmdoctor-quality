import {
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
}
