import { ArrayUnique, IsArray, IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { PERMISSOES, Permissao } from '../../common/constants/permissoes';

export class CreateCargoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsInt()
  @Min(1)
  nivel: number;

  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSOES, { each: true })
  permissoes: Permissao[];
}
