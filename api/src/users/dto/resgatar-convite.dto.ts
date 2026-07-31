import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResgatarConviteDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter ao menos 8 caracteres' })
  senha: string;
}
