import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { StatusVisita } from '@prisma/client';

export class CreateVisitaDto {
  @IsUUID()
  consultorId: string;

  @IsUUID()
  empresaId: string;

  // Opcional: visita comercial ou diagnóstico inicial não pertence a projeto
  // nenhum. Quando vem preenchido, o service confere que o projeto é da mesma
  // empresa da visita. Aceita null explícito porque é assim que a edição
  // desvincula uma visita do projeto: `undefined` significaria "não mexi neste
  // campo" e deixaria o vínculo antigo de pé.
  @IsOptional()
  @ValidateIf((dto: CreateVisitaDto) => dto.projetoId !== null)
  @IsUUID()
  projetoId?: string | null;

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
