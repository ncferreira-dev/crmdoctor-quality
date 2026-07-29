import { PartialType } from '@nestjs/mapped-types';
import { CreateEtapaDto } from './create-etapa.dto';

export class UpdateEtapaDto extends PartialType(CreateEtapaDto) {}
