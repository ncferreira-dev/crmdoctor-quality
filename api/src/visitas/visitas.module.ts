import { Module } from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { VisitasController } from './visitas.controller';

@Module({
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
