import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindVisitasQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsDateString()
  de?: string;

  @IsOptional()
  @IsDateString()
  ate?: string;

  @IsOptional()
  @IsUUID()
  consultorId?: string;

  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
