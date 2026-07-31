import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
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
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { CompetenciasModule } from './competencias/competencias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Teto global anti-abuso: 100 req / 60s por IP. Rotas sensíveis (login)
    // apertam esse limite com @Throttle no próprio handler.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    CargosModule,
    UsersModule,
    LeadsModule,
    EmpresasModule,
    ProjetosModule,
    InteracoesModule,
    TicketsModule,
    ConsultoresModule,
    CompetenciasModule,
    VisitasModule,
    DashboardModule,
    NotificacoesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
