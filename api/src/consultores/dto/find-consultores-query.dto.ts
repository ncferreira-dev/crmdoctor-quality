import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindConsultoresQueryDto extends PaginacaoDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsUUID()
  competenciaId?: string;
}
