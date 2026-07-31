import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { paraBoolean } from '../../common/transforms/para-boolean';

export class FindConsultoresQueryDto extends PaginacaoDto {
  @IsOptional()
  @Transform(paraBoolean)
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsUUID()
  competenciaId?: string;
}
