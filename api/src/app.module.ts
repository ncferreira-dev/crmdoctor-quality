import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CargosModule } from './cargos/cargos.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ProjetosModule } from './projetos/projetos.module';
import { InteracoesModule } from './interacoes/interacoes.module';
import { TicketsModule } from './tickets/tickets.module';
import { ConsultoresModule } from './consultores/consultores.module';
import { VisitasModule } from './visitas/visitas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CargosModule,
    UsersModule,
    LeadsModule,
    EmpresasModule,
    ProjetosModule,
    InteracoesModule,
    TicketsModule,
    ConsultoresModule,
    VisitasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
