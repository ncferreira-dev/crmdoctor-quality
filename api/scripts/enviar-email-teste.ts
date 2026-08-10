// Prova que o motor de e-mail funciona, de ponta a ponta e de verdade.
//
// Existe porque "a API respondeu 200" não é prova de que alguém foi avisado. O
// critério do item 2 do ENTREGA.md é o e-mail CHEGAR numa caixa de entrada, e
// este script é o caminho mais curto até esse fato: sobe só o ConfigModule e o
// EmailModule, chama o mesmo EmailService que o cron vai chamar, e imprime o
// id que o provedor devolveu.
//
// Uso, na pasta api/:
//   npm run email:teste -- voce@exemplo.com
//
// Enquanto o domínio doctorquality.com.br não estiver verificado (item 5), o
// remetente é o domínio de teste do Resend, e ele SÓ entrega para o e-mail
// dono da conta do Resend. Mandar para outro endereço devolve erro, e o erro
// aparece aqui em vez de sumir.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), EmailModule],
})
class ModuloDeTesteDeEmail {}

async function main() {
  const destino = process.argv[2];

  if (!destino || !destino.includes('@')) {
    console.error('Falta o destinatário.');
    console.error('Uso: npm run email:teste -- voce@exemplo.com');
    process.exit(1);
  }

  const contexto = await NestFactory.createApplicationContext(
    ModuloDeTesteDeEmail,
    { logger: ['log', 'warn', 'error'] },
  );
  const email = contexto.get(EmailService);

  if (!email.ligado) {
    console.error('');
    console.error('O motor está desligado: falta a RESEND_API_KEY.');
    console.error(
      'O passo a passo está em CHAVES-PENDENTES.md, na raiz do repositório.',
    );
    await contexto.close();
    process.exit(1);
  }

  const agora = new Date().toISOString();
  const resultado = await email.enviar({
    para: destino,
    assunto: 'Teste do motor de e-mail do CRM Doctor Quality',
    texto:
      'Se você está lendo isto, o motor de e-mail do CRM funciona.\n\n' +
      `Enviado em ${agora}.\n\n` +
      'Este é um teste do item 2 do programa de entrega. O aviso diário de ' +
      'prazos de compliance ainda não está ligado: ele é o item 3.',
    html:
      '<p>Se você está lendo isto, o motor de e-mail do CRM funciona.</p>' +
      `<p style="color:#666">Enviado em ${agora}.</p>` +
      '<p style="color:#666">Este é um teste do item 2 do programa de entrega. ' +
      'O aviso diário de prazos de compliance ainda não está ligado: ele é o item 3.</p>',
  });

  await contexto.close();

  console.log('');
  if (resultado.enviado) {
    console.log('ENVIADO.');
    console.log(`  destinatário: ${destino}`);
    console.log(`  id da mensagem: ${resultado.id}`);
    console.log('');
    console.log(
      'Agora abra a caixa de entrada. O motor só está provado quando',
    );
    console.log(
      'a mensagem estiver lá, e não quando este script disser enviado.',
    );
    process.exit(0);
  }

  console.error('NÃO ENVIADO.');
  console.error(`  motivo: ${resultado.motivo}`);
  console.error(`  erro:   ${resultado.erro}`);
  process.exit(1);
}

void main();
