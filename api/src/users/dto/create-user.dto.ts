import { Transform } from 'class-transformer';
import { aparar } from '../../common/transforms/aparar';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// Espaço no começo ou no fim de um nome não é dado, é digitação. Sem isto,
// "Giovanna " entra no banco com o espaço e aparece assim em toda tela que
// mostra o nome, inclusive no filtro de consultor da agenda e na carga do
// dashboard. Aconteceu de verdade em 05/08/2026. Aparar é trabalho da API, e
// não do formulário: o formulário é um cliente, e cliente não é para confiar.
// Cadastro de membro: quem cadastra NÃO define a senha de outra pessoa. O
// sistema gera um código de primeiro acesso e o próprio membro escolhe a senha
// ao resgatá-lo.
export class CreateUserDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  nome: string;

  @Transform(aparar)
  @IsEmail()
  email: string;

  @Transform(aparar)
  @IsOptional()
  @IsString()
  telefone?: string;

  @IsUUID()
  cargoId: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Só faz sentido para quem atua como consultor, mas fica livre para
  // qualquer cargo: não é a hierarquia que decide isso, é o formulário.
  @Transform(aparar)
  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  competenciaIds?: string[];
}
