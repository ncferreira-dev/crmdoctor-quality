import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// Cadastro de membro: quem cadastra NÃO define a senha de outra pessoa. O
// sistema gera um código de primeiro acesso e o próprio membro escolhe a senha
// ao resgatá-lo.
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

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
  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  competenciaIds?: string[];
}
