import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { aparar } from '../../common/transforms/aparar';

export class ResgatarConviteDto {
  // O e-mail entrou aqui em 09/08/2026, junto com o convite virar hash. Não é
  // pedido a mais por gosto: argon2 é salgado, então não há como achar a conta
  // pelo hash do código. O e-mail acha a linha e o código é conferido nela.
  //
  // Aparado antes de validar pelo mesmo motivo do CreateUserDto: espaço no fim
  // vindo de copiar e colar faria o e-mail não bater com o cadastrado, e a
  // pessoa leria "código inválido" olhando para o código certo.
  @Transform(aparar)
  @IsEmail({}, { message: 'Informe o e-mail do seu cadastro' })
  email: string;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter ao menos 8 caracteres' })
  senha: string;
}
