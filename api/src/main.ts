import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Faz o SIGTERM do deploy chegar no onModuleDestroy do PrismaService, senão
  // cada redeploy deixa conexão pendurada no Neon até dar timeout.
  app.enableShutdownHooks();

  const origins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Em produção, FRONTEND_URL vazio bloqueia o CORS em vez de liberar geral.
  // O token fica no localStorage do front, então `origin: true` em produção
  // deixaria qualquer site chamar a API autenticado.
  if (!origins.length && process.env.NODE_ENV === 'production') {
    throw new Error('Defina FRONTEND_URL em produção (origem permitida no CORS)');
  }
  app.enableCors({ origin: origins.length ? origins : true });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
