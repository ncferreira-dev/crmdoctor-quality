// Dispara o aviso diário CONTRA UM BANCO DE VERDADE e mostra o que sairia,
// para quem.
//
// Existe porque o critério do item 3 do ENTREGA.md não é "o teste unitário
// passa": é rodar o disparo com destinatários diferentes e conferir que cada um
// recebe o SEU conteúdo, e que quem não tem nada não recebe nada. Teste com
// mock prova a regra; este script prova a regra contra os dados.
//
// Uso, na pasta api/:
//   npm run resumo:teste          (só mostra, não manda nem carimba o dia)
//   npm run resumo:teste -- --enviar   (manda de verdade, se houver chave)
//
// O modo padrão é ENSAIO: troca o motor de e-mail por um dublê que imprime o
// destinatário e o corpo, e não carimba a execução do dia. É o modo seguro de
// rodar quantas vezes for preciso sem gastar o disparo diário nem encher a
// caixa de ninguém.

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  EmailService,
  MensagemEmail,
  ResultadoEnvio,
} from '../src/email/email.service';
import { NotificacoesService } from '../src/notificacoes/notificacoes.service';

// Monta o serviço à mão, sem subir a aplicação inteira. É de propósito: o
// NotificacoesService dispara o cron no boot, então subir o AppModule aqui
// rodaria a rodada duas vezes e a medição contaria errado.
function montarServico(enviarDeVerdade: boolean) {
  const prisma = new PrismaService();
  const email = new EmailService(new ConfigService());
  email.onModuleInit();

  if (!enviarDeVerdade) {
    const dubleDoMotor = email as unknown as {
      enviar: (m: MensagemEmail) => Promise<ResultadoEnvio>;
    };
    dubleDoMotor.enviar = (mensagem: MensagemEmail) => {
      console.log('');
      console.log('-----------------------------------------------------');
      console.log(`PARA:     ${mensagem.para}`);
      console.log(`ASSUNTO:  ${mensagem.assunto}`);
      console.log('');
      console.log(mensagem.texto);
      console.log('-----------------------------------------------------');
      return Promise.resolve({ enviado: true, id: 'ensaio' });
    };
  }

  return {
    prisma,
    email,
    servico: new NotificacoesService(prisma, email),
  };
}

async function main() {
  const enviarDeVerdade = process.argv.includes('--enviar');
  const { prisma, email, servico } = montarServico(enviarDeVerdade);

  console.log(
    enviarDeVerdade
      ? `MODO ENVIO. Motor ${email.ligado ? 'ligado' : 'DESLIGADO'}.`
      : 'MODO ENSAIO. Nada sai daqui, e o disparo do dia continua disponível.',
  );

  await prisma.$connect();
  const resultado = await servico.dispararResumoDiario({
    // Ensaio força e não carimba, porque a graça é poder repetir. Envio de
    // verdade respeita a trava de um por dia, que é justamente o que se quer
    // provar em produção.
    forcar: !enviarDeVerdade,
    carimbar: enviarDeVerdade,
  });

  console.log('');
  console.log('CONTAGENS');
  console.log(`  pessoas com alerta pendente: ${resultado.pessoasComAlerta}`);
  console.log(`  e-mails montados/enviados:   ${resultado.enviados}`);
  console.log(`  falhas de envio:             ${resultado.falhas}`);
  console.log(`  pessoas sem nada (não recebem): ${resultado.semNadaPendente}`);
  if (resultado.jaSaiuHoje) {
    console.log('  (o aviso de hoje já tinha saído: nada foi disparado)');
  }

  await prisma.$disconnect();
}

void main();
