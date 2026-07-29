import { Body, Controller, Delete, Param, Patch } from '@nestjs/common';
import { EtapasService } from './etapas.service';
import { UpdateEtapaDto } from './dto/update-etapa.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('etapas')
export class EtapasController {
  constructor(private etapasService: EtapasService) {}

  @RequirePermissao('PROJETOS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEtapaDto) {
    return this.etapasService.update(id, dto);
  }

  @RequirePermissao('PROJETOS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.etapasService.remove(id);
  }
}
