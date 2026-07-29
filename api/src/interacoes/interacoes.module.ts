import { Module } from '@nestjs/common';
import { InteracoesService } from './interacoes.service';
import { InteracoesController } from './interacoes.controller';

@Module({
  controllers: [InteracoesController],
  providers: [InteracoesService],
})
export class InteracoesModule {}
