import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsUUID()
  cargoId: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
