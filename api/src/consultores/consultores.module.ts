import { Module } from '@nestjs/common';
import { ConsultoresService } from './consultores.service';
import { ConsultoresController } from './consultores.controller';

@Module({
  controllers: [ConsultoresController],
  providers: [ConsultoresService],
})
export class ConsultoresModule {}
