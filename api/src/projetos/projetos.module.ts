import { Module } from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { ProjetosController } from './projetos.controller';
import { EtapasService } from './etapas.service';
import { EtapasController } from './etapas.controller';
import { ProjetoEtapasController } from './projeto-etapas.controller';

@Module({
  controllers: [ProjetosController, ProjetoEtapasController, EtapasController],
  providers: [ProjetosService, EtapasService],
  exports: [ProjetosService],
})
export class ProjetosModule {}
