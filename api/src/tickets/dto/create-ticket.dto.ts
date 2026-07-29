import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsIn([1, 2, 3])
  prioridade?: number;

  @IsUUID()
  empresaId: string;

  // Quando o cliente pediu; pode ser diferente de quando o ticket foi cadastrado.
  @IsOptional()
  @IsDateString()
  abertoEm?: string;
}
