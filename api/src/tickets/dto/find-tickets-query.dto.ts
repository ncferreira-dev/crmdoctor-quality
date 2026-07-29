import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusTicket } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FindTicketsQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  emAtraso?: boolean;
}
