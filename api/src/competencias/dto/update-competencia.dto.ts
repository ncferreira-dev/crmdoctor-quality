import { PartialType } from '@nestjs/mapped-types';
import { CreateCompetenciaDto } from './create-competencia.dto';

export class UpdateCompetenciaDto extends PartialType(CreateCompetenciaDto) {}
