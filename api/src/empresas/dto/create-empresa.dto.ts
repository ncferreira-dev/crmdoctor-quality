import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Segmento } from '@prisma/client';
import { EhCnpj, normalizarCnpj } from '../../common/validadores/cnpj';
import { aparar } from '../../common/transforms/aparar';
import { Transform } from 'class-transformer';

export class CreateEmpresaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  nome: string;

  // Guardado só com dígitos, de propósito: com máscara, "12.345.678/0001-90" e
  // "12345678000190" seriam duas empresas diferentes para o índice único, e o
  // mesmo cliente entraria duas vezes. A tela manda como a pessoa digitou.
  @IsOptional()
  @normalizarCnpj
  @EhCnpj()
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
