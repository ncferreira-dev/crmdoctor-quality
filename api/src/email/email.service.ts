import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// Remetente do domínio de teste do provedor. Ele entrega SEM depender de DNS,
// e é como o motor se prova antes de doctorquality.com.br estar verificado. A
// limitação vale conhecer: o Resend só aceita entregar deste remetente para o
// e-mail dono da conta. É suficiente para provar que o motor funciona, e não é
// suficiente para avisar a equipe: isso depende do item 5 do ENTREGA.md.
const REMETENTE_DE_TESTE = 'CRM Doctor Quality <onboarding@resend.dev>';

export interface MensagemEmail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export type ResultadoEnvio =
  | { enviado: true; id: string }
  | { enviado: false; motivo: 'desligado' | 'falhou'; erro: string };

// O motor de envio, e só isso: quem monta o conteúdo do aviso diário é o
// módulo de notificações (item 3 do ENTREGA.md). Separado de propósito, para
// trocar de provedor um dia não significar mexer na regra de compliance.
//
// A regra que mais importa neste arquivo: **nada aqui falha em silêncio.** A
// decisão de produto registrada em 03/08/2026 é explícita, "latência não
// machuca com um usuário, o que machuca é falha silenciosa", e um motor de
// aviso que engole o próprio erro é a pior versão desse defeito: o sistema
// passaria a acreditar que avisou.
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private cliente: Resend | null = null;
  private remetente = REMETENTE_DE_TESTE;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const chave = this.config.get<string>('RESEND_API_KEY');
    const remetente = this.config.get<string>('EMAIL_REMETENTE');

    if (remetente) {
      this.remetente = remetente;
    }

    if (!chave) {
      // Aviso no boot, e não só na hora do envio. Sem esta linha, um container
      // sem a chave subiria calado e o primeiro sinal de que ninguém está
      // sendo avisado seria um prazo perdido. Não derruba o boot de propósito:
      // API fora do ar é pior que API sem e-mail.
      this.logger.warn(
        'MOTOR DE E-MAIL DESLIGADO: RESEND_API_KEY não está definida. ' +
          'Nenhum aviso de compliance vai sair do sistema. ' +
          'O passo a passo para obter a chave está em CHAVES-PENDENTES.md.',
      );
      return;
    }

    this.cliente = new Resend(chave);
    this.logger.log(`Motor de e-mail ligado, remetente ${this.remetente}`);
  }

  get ligado(): boolean {
    return this.cliente !== null;
  }

  async enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    if (!this.cliente) {
      // Desligado é registrado com o destinatário e o assunto, não com um
      // "pulei" genérico: quem ler o log precisa saber exatamente qual aviso
      // deixou de sair, e para quem.
      this.logger.warn(
        `E-mail NÃO enviado (motor desligado) para ${mensagem.para}: "${mensagem.assunto}"`,
      );
      return {
        enviado: false,
        motivo: 'desligado',
        erro: 'RESEND_API_KEY não configurada',
      };
    }

    try {
      const resposta = await this.cliente.emails.send({
        from: this.remetente,
        to: mensagem.para,
        subject: mensagem.assunto,
        html: mensagem.html,
        text: mensagem.texto,
      });

      // O SDK do Resend devolve { data, error } em vez de lançar: erro de
      // domínio não verificado, destinatário recusado e chave inválida chegam
      // TODOS por aqui. Tratar só o catch deixaria esses três passarem como
      // sucesso, que é exatamente a falha silenciosa que este arquivo existe
      // para não ter.
      if (resposta.error) {
        this.logger.error(
          `Falha ao enviar para ${mensagem.para}: ${resposta.error.message}`,
        );
        return {
          enviado: false,
          motivo: 'falhou',
          erro: resposta.error.message,
        };
      }

      const id = resposta.data?.id ?? '';
      this.logger.log(`E-mail enviado para ${mensagem.para}, id ${id}`);
      return { enviado: true, id };
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(`Falha ao enviar para ${mensagem.para}: ${detalhe}`);
      return { enviado: false, motivo: 'falhou', erro: detalhe };
    }
  }
}
