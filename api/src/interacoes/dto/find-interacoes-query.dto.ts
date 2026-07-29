import { IsOptional, IsUUID } from 'class-validator';

export class FindInteracoesQueryDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsUUID()
  projetoId?: string;
}
