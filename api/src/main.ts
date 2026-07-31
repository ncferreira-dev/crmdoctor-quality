import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Atrás do proxy do EasyPanel (Traefik): sem confiar 1 hop, o Express veria
  // o IP do proxy em toda request e o rate limit contaria todo mundo no mesmo
  // balde. Confiar só 1 hop lê o X-Forwarded-For real sem deixar o cliente
  // forjar a cadeia inteira.
  app.set('trust proxy', 1);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Faz o SIGTERM do deploy chegar no onModuleDestroy do PrismaService, senão
  // cada redeploy deixa conexão pendurada no Neon até dar timeout.
  app.enableShutdownHooks();

  const origensPermitidas = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // O front é hospedado na Vercel, que emite uma URL única por deploy além do
  // alias fixo. Aceitar *.vercel.app cobre os dois sem depender de FRONTEND_URL
  // estar sincronizado no painel. Continua fechado pro resto (não é origin:true):
  // o token fica no localStorage, então liberar geral deixaria qualquer site
  // chamar a API autenticado.
  const VERCEL_HOST = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

  app.enableCors({
    origin: (origin, callback) => {
      // Requests sem Origin (curl, health check, server-to-server) passam.
      if (!origin) {
        return callback(null, true);
      }
      const permitido =
        origensPermitidas.includes(origin) || VERCEL_HOST.test(origin);
      return callback(
        permitido ? null : new Error('Origem não permitida pelo CORS'),
        permitido,
      );
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
