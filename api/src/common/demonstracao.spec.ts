import {
  EMPRESA_REAL,
  ETAPA_REAL,
  INTERACAO_REAL,
  NOTIFICACAO_REAL,
  PROJETO_REAL,
  TAREFA_REAL,
  TICKET_REAL,
  VISITA_REAL,
} from './demonstracao';

// O que estes testes protegem não é o formato do objeto: é a REGRA de quem
// carrega a flag e quem herda. Repetir a coluna em cada filho seria criar
// quatro lugares para a mesma verdade divergir, e derivar tudo do pai deixaria
// passar as interações de demonstração que estão em empresas reais.
describe('recorte de dado de demonstração', () => {
  it('empresa, projeto e interação decidem por coluna própria', () => {
    expect(EMPRESA_REAL).toEqual({ demonstracao: false });
    expect(PROJETO_REAL).toEqual({ demonstracao: false });
    expect(INTERACAO_REAL).toEqual({ demonstracao: false });
  });

  it('ticket e visita herdam da empresa', () => {
    expect(TICKET_REAL).toEqual({ empresa: { demonstracao: false } });
    expect(VISITA_REAL).toEqual({ empresa: { demonstracao: false } });
  });

  it('marco herda do projeto', () => {
    expect(ETAPA_REAL).toEqual({ projeto: { demonstracao: false } });
  });

  // Tarefa sem projeto é trabalho de verdade que alguém distribuiu. Tratá-la
  // como demonstração sumiria com tarefa legítima da lista de quem a recebeu.
  it('tarefa sem projeto continua sendo real', () => {
    expect(TAREFA_REAL).toEqual({
      OR: [{ projetoId: null }, { projeto: { demonstracao: false } }],
    });
  });

  // Alerta de compliance pode vir de projeto OU de marco, e os dois caminhos
  // precisam ser filtrados: um alerta de marco de projeto de demonstração
  // cobraria prazo de contrato que não existe.
  it('alerta filtra pelos dois caminhos, projeto e marco', () => {
    expect(NOTIFICACAO_REAL).toEqual({
      AND: [
        { OR: [{ projetoId: null }, { projeto: { demonstracao: false } }] },
        {
          OR: [
            { etapaId: null },
            { etapa: { projeto: { demonstracao: false } } },
          ],
        },
      ],
    });
  });
});
