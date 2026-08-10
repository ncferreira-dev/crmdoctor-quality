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

  // forbidNonWhitelisted: campo que não existe no DTO devolve 400 em vez de ser
  // descartado em silêncio.
  //
  // Só `whitelist` fazia a API responder 200 a uma requisição que ela ignorou
  // por inteiro. Medido antes: `PATCH /tickets/:id` com `{status}` respondia
  // 200 e não mudava nada. Isso é fábrica de "cliquei e não aconteceu nada", e
  // o custo de descobrir é sempre de quem está na frente do cliente.
  //
  // Ligar isto muda o contrato de TODAS as rotas de uma vez, e por isso o item
  // dependia do teste de tabela do item 12: ele é a rede que mostra o que
  // quebrou.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
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
    // Quanto tempo o navegador pode guardar a resposta do preflight.
    //
    // Toda chamada autenticada manda `Authorization`, que não está na lista de
    // cabeçalhos simples do CORS. Isso sozinho obriga um OPTIONS antes de cada
    // requisição, e nenhuma faxina no front tira isso: medido em 10/08/2026,
    // depois de o `Content-Type` sair dos GET, os OPTIONS continuaram lá.
    //
    // O que dá para fazer é não repetir o preflight a cada chamada. Sem este
    // campo o navegador guarda por 5 segundos, então uma tela que recarrega
    // lista a cada minuto paga o dobro de requisições para sempre. 7200s é o
    // teto que o Chrome respeita; mandar mais seria pedir o que ele ignora.
    maxAge: 7200,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
