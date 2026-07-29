import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FindVisitasQueryDto {
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
