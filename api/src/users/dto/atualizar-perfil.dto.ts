import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Dados que a pessoa altera em si mesma. E-mail e cargo ficam de fora: e-mail
// é a identidade de login e cargo é o que define o próprio acesso — quem pode
// mudar o próprio cargo não tem hierarquia nenhuma.
export class AtualizarPerfilDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
