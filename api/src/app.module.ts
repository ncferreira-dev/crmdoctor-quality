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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CargosModule,
    UsersModule,
    LeadsModule,
    EmpresasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
