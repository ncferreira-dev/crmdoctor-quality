import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { paraBoolean } from '../../common/transforms/para-boolean';

export class FindNotificacoesQueryDto {
  @IsOptional()
  @Transform(paraBoolean)
  @IsBoolean()
  lida?: boolean;
}
