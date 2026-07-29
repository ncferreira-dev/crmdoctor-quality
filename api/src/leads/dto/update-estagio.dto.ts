import { IsEnum } from 'class-validator';
import { EstagioLead } from '@prisma/client';

export class UpdateEstagioDto {
  @IsEnum(EstagioLead)
  estagio: EstagioLead;
}
