import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// O SDK é trocado por um dublê: estes testes travam o CONTRATO do serviço
// (o que ele faz com sucesso, com erro e sem chave), não a rede do provedor.
// A prova de que o e-mail chega de verdade é o script scripts/enviar-email-teste.ts,
// e ela é humana de propósito: só a caixa de entrada prova entrega.
// Tipado em vez de `jest.fn()` cru: o mock nasce `any` e ler
// `mock.calls[0][0]` dele é acesso inseguro, o que faria o `as` logo abaixo
// mentir sem ninguém perceber se a chamada mudasse. Mesmo padrão dos outros
// specs desta base.
const enviarNoSdk = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: enviarNoSdk },
  })),
}));

function servicoCom(variaveis: Record<string, string | undefined>) {
  const config = {
    get: (chave: string) => variaveis[chave],
  } as unknown as ConfigService;
  const servico = new EmailService(config);
  servico.onModuleInit();
  return servico;
}

const MENSAGEM = {
  para: 'alguem@exemplo.com',
  assunto: 'Prazo de compliance',
  html: '<p>oi</p>',
  texto: 'oi',
};

describe('EmailService', () => {
  beforeEach(() => {
    enviarNoSdk.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sem chave, o motor nasce desligado e diz isso', () => {
    const servico = servicoCom({});
    expect(servico.ligado).toBe(false);
  });

  it('sem chave, não tenta enviar e devolve o motivo, em vez de fingir que enviou', async () => {
    const servico = servicoCom({});

    const resultado = await servico.enviar(MENSAGEM);

    expect(enviarNoSdk).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      enviado: false,
      motivo: 'desligado',
      erro: 'RESEND_API_KEY não configurada',
    });
  });

  it('com chave, envia e devolve o id que o provedor deu', async () => {
    enviarNoSdk.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
    const servico = servicoCom({ RESEND_API_KEY: 're_abc' });

    const resultado = await servico.enviar(MENSAGEM);

    expect(servico.ligado).toBe(true);
    expect(resultado).toEqual({ enviado: true, id: 'msg_123' });
    const argumento = enviarNoSdk.mock.calls[0][0] as {
      to: string;
      from: string;
    };
    expect(argumento.to).toBe('alguem@exemplo.com');
    // Sem remetente configurado, cai no domínio de teste do provedor, que
    // entrega sem depender de DNS.
    expect(argumento.from).toContain('onboarding@resend.dev');
  });

  it('respeita o remetente configurado quando o domínio estiver verificado', async () => {
    enviarNoSdk.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const servico = servicoCom({
      RESEND_API_KEY: 're_abc',
      EMAIL_REMETENTE: 'CRM <avisos@drquality.com.br>',
    });

    await servico.enviar(MENSAGEM);

    const argumento = enviarNoSdk.mock.calls[0][0] as { from: string };
    expect(argumento.from).toBe('CRM <avisos@drquality.com.br>');
  });

  // O caso que mais importa. O SDK do Resend NÃO lança em erro de domínio não
  // verificado, chave inválida ou destinatário recusado: devolve { error }.
  // Tratar só o catch faria os três passarem por sucesso, e o sistema passaria
  // a acreditar que avisou alguém que nunca foi avisado.
  it('erro devolvido no corpo da resposta NÃO conta como enviado', async () => {
    enviarNoSdk.mockResolvedValue({
      data: null,
      error: { message: 'The drquality.com.br domain is not verified' },
    });
    const servico = servicoCom({ RESEND_API_KEY: 're_abc' });

    const resultado = await servico.enviar(MENSAGEM);

    expect(resultado).toEqual({
      enviado: false,
      motivo: 'falhou',
      erro: 'The drquality.com.br domain is not verified',
    });
  });

  it('exceção de rede também não conta como enviado', async () => {
    enviarNoSdk.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
    const servico = servicoCom({ RESEND_API_KEY: 're_abc' });

    const resultado = await servico.enviar(MENSAGEM);

    expect(resultado).toEqual({
      enviado: false,
      motivo: 'falhou',
      erro: 'getaddrinfo ENOTFOUND',
    });
  });
});
