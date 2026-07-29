import { PartialType } from '@nestjs/mapped-types';
import { CreateConsultorDto } from './create-consultor.dto';

export class UpdateConsultorDto extends PartialType(CreateConsultorDto) {}
