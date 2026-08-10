import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

// Global pelo mesmo motivo do PrismaModule: e-mail é infraestrutura, e o
// próximo módulo que precisar avisar alguém não deveria ter que se lembrar de
// importar nada. Hoje só notificações usa.
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
