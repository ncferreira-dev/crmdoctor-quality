import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { StatusEtapa } from '@prisma/client';

export class CreateEtapaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsInt()
  @Min(1)
  ordem: number;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @IsEnum(StatusEtapa)
  status?: StatusEtapa;
}
