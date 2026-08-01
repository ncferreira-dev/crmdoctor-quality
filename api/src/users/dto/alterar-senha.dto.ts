import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Troca da própria senha. Exige a senha atual de propósito: sem isso, uma
// sessão sequestrada trocaria a senha e tomaria a conta de vez.
export class AlterarSenhaDto {
  @IsString()
  @IsNotEmpty()
  senhaAtual: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter ao menos 8 caracteres' })
  novaSenha: string;
}
