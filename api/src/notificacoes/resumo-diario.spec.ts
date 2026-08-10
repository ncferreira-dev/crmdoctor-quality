import {
  AlertaDoResumo,
  montarResumo,
  separarEmSecoes,
  totalDeAlertas,
} from './resumo-diario';

const HOJE = new Date('2026-08-10T00:00:00.000Z');
const ONTEM = new Date('2026-08-09T09:00:00.000Z');
const HOJE_DE_MANHA = new Date('2026-08-10T11:00:00.000Z');

function alerta(
  mensagem: string,
  dataReferencia: string | null,
  criadoEm: Date,
): AlertaDoResumo {
  return {
    mensagem,
    dataReferencia: dataReferencia ? new Date(dataReferencia) : null,
    criadoEm,
  };
}

describe('separarEmSecoes', () => {
  it('separa vencido, novo de hoje e o que arrasta desde ontem', () => {
    const secoes = separarEmSecoes(
      [
        alerta('venceu semana passada', '2026-08-03T00:00:00.000Z', ONTEM),
        alerta(
          'vence daqui a pouco',
          '2026-08-14T00:00:00.000Z',
          HOJE_DE_MANHA,
        ),
        alerta('arrasta desde ontem', '2026-08-20T00:00:00.000Z', ONTEM),
      ],
      HOJE,
    );

    expect(secoes.venceu.map((a) => a.mensagem)).toEqual([
      'venceu semana passada',
    ]);
    expect(secoes.venceEmBreve.map((a) => a.mensagem)).toEqual([
      'vence daqui a pouco',
    ]);
    expect(secoes.desdeOntem.map((a) => a.mensagem)).toEqual([
      'arrasta desde ontem',
    ]);
  });

  // A regra que faz o e-mail ser legível: nenhum alerta aparece duas vezes. Um
  // vencido que também é antigo continua sendo assunto de uma seção só.
  it('vencido antigo fica só em "venceu", e não também em "desde ontem"', () => {
    const secoes = separarEmSecoes(
      [alerta('vencido e velho', '2026-08-01T00:00:00.000Z', ONTEM)],
      HOJE,
    );

    expect(secoes.venceu).toHaveLength(1);
    expect(secoes.desdeOntem).toHaveLength(0);
    expect(totalDeAlertas(secoes)).toBe(1);
  });

  it('o prazo de hoje conta como a vencer, não como vencido', () => {
    const secoes = separarEmSecoes(
      [alerta('vence hoje', '2026-08-10T00:00:00.000Z', HOJE_DE_MANHA)],
      HOJE,
    );

    expect(secoes.venceu).toHaveLength(0);
    expect(secoes.venceEmBreve).toHaveLength(1);
  });

  it('alerta sem data de referência não entra em seção nenhuma', () => {
    const secoes = separarEmSecoes([alerta('sem prazo', null, ONTEM)], HOJE);
    expect(totalDeAlertas(secoes)).toBe(0);
  });

  it('dentro da seção o prazo mais apertado vem primeiro', () => {
    const secoes = separarEmSecoes(
      [
        alerta('depois', '2026-08-20T00:00:00.000Z', HOJE_DE_MANHA),
        alerta('antes', '2026-08-12T00:00:00.000Z', HOJE_DE_MANHA),
      ],
      HOJE,
    );

    expect(secoes.venceEmBreve.map((a) => a.mensagem)).toEqual([
      'antes',
      'depois',
    ]);
  });
});

describe('montarResumo', () => {
  it('conta os dias na hora do envio, e não lê contagem gravada', () => {
    const secoes = separarEmSecoes(
      [
        alerta('Etapa A', '2026-08-13T00:00:00.000Z', HOJE_DE_MANHA),
        alerta('Etapa B', '2026-08-10T00:00:00.000Z', HOJE_DE_MANHA),
        alerta('Etapa C', '2026-08-07T00:00:00.000Z', ONTEM),
      ],
      HOJE,
    );

    const { texto, assunto } = montarResumo('Renata', secoes, HOJE);

    expect(texto).toContain('Etapa A (vence em 3 dias)');
    expect(texto).toContain('Etapa B (vence hoje)');
    expect(texto).toContain('Etapa C (venceu há 3 dias)');
    expect(assunto).toBe('Compliance: 1 prazo(s) vencido(s) e 2 a vencer');
  });

  it('o assunto muda quando só há vencido, para não virar assunto genérico', () => {
    const secoes = separarEmSecoes(
      [alerta('Etapa C', '2026-08-07T00:00:00.000Z', ONTEM)],
      HOJE,
    );
    expect(montarResumo('Renata', secoes, HOJE).assunto).toBe(
      'Compliance: 1 prazo(s) vencido(s)',
    );
  });

  it('seção vazia não aparece no e-mail', () => {
    const secoes = separarEmSecoes(
      [alerta('Etapa A', '2026-08-13T00:00:00.000Z', HOJE_DE_MANHA)],
      HOJE,
    );
    const { texto } = montarResumo('Renata', secoes, HOJE);

    expect(texto).toContain('VENCE (1)');
    expect(texto).not.toContain('JÁ VENCEU');
    expect(texto).not.toContain('EM ABERTO DESDE ONTEM');
  });

  // Nome de projeto e de empresa é texto digitado por gente e vai para dentro
  // de HTML. Sem escapar, um nome com tag dentro viraria marcação de verdade na
  // caixa de entrada.
  it('escapa o que veio do banco antes de pôr no HTML', () => {
    const secoes = separarEmSecoes(
      [
        alerta(
          'Projeto <script>alerta()</script> & cia',
          '2026-08-13T00:00:00.000Z',
          HOJE_DE_MANHA,
        ),
      ],
      HOJE,
    );
    const { html, texto } = montarResumo('Renata', secoes, HOJE);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; cia');
    // O texto puro não precisa escapar: lá tag não vira marcação.
    expect(texto).toContain('<script>');
  });

  it('não usa travessão no texto de produto', () => {
    const secoes = separarEmSecoes(
      [alerta('Etapa A', '2026-08-13T00:00:00.000Z', HOJE_DE_MANHA)],
      HOJE,
    );
    const { texto, html, assunto } = montarResumo('Renata', secoes, HOJE);
    for (const parte of [texto, html, assunto]) {
      expect(parte).not.toContain('—');
    }
  });
});
