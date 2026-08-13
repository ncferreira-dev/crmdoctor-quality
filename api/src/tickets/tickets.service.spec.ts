import { Prisma } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';

// O que estes testes protegem: o `where` da lista de chamados.
//
// A tela de Chamados (12/08/2026) trouxe três filtros que se combinam, e dois
// deles escrevem a MESMA chave do Prisma. Espalhados num objeto só, o último
// apagava o primeiro sem erro nenhum: a resposta vinha 200, com a lista errada,
// e a tela mostrava chamado resolvido dentro de "Em aberto". Aqui se prova que
// cada filtro escolhido chega inteiro à consulta.
//
// Os argumentos são capturados numa lista, e não lidos de `mock.calls`, porque
// `mock.calls` é `any` e o lint proíbe `any` nesta base.

function criarMockPrisma() {
  const buscas: Prisma.TicketFindManyArgs[] = [];
  const atualizacoes: Prisma.TicketUpdateArgs[] = [];

  return {
    buscas,
    atualizacoes,
    prisma: {
      ticket: {
        findMany: jest.fn((args: Prisma.TicketFindManyArgs) => {
          buscas.push(args);
          return Promise.resolve([]);
        }),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn((args: Prisma.TicketUpdateArgs) => {
          atualizacoes.push(args);
          return Promise.resolve({
            id: 't1',
            abertoEm: new Date(),
            prioridade: 2,
            primeiraRespostaEm: null,
            status: 'ABERTO',
            empresa: { id: 'e1', nome: 'Opella' },
          });
        }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService,
  };
}

type Espiao = ReturnType<typeof criarMockPrisma>;

function consulta(
  parcial: Partial<FindTicketsQueryDto> = {},
): FindTicketsQueryDto {
  return { page: 1, limit: 20, ...parcial };
}

async function buscaFeitaCom(query: FindTicketsQueryDto) {
  const espiao = criarMockPrisma();
  await new TicketsService(espiao.prisma).findAll(query);
  return espiao.buscas[0];
}

const EMPRESA_ENXUTA = { empresa: { select: { id: true, nome: true } } };

describe('TicketsService.findAll', () => {
  it('nunca devolve chamado de empresa excluída', async () => {
    // A extensão do Prisma filtra soft delete no where DE CIMA, que aqui é o do
    // ticket. A empresa entra por relação e ficaria de fora: o chamado
    // apareceria na lista com o nome de um cliente que não existe mais.
    const busca = await buscaFeitaCom(consulta());
    expect(busca.where?.empresa).toEqual({ excluidoEm: null });
  });

  it('traz o nome da empresa junto, e só o nome', async () => {
    const busca = await buscaFeitaCom(consulta());
    expect(busca.include).toEqual(EMPRESA_ENXUTA);
  });

  it('ordena por prioridade antes da data', async () => {
    const busca = await buscaFeitaCom(consulta());
    expect(busca.orderBy).toEqual([
      { prioridade: 'asc' },
      { abertoEm: 'desc' },
    ]);
  });

  it('sem filtro nenhum, não recorta nada além da empresa viva', async () => {
    const busca = await buscaFeitaCom(consulta());
    expect(busca.where?.AND).toEqual([]);
  });

  it('emAberto vira a mesma regra que o dashboard usa', async () => {
    const busca = await buscaFeitaCom(consulta({ emAberto: true }));
    expect(busca.where?.AND).toEqual([{ status: { not: 'RESOLVIDO' } }]);
  });

  it('emAtraso cobra o prazo de cada prioridade, e só entre os abertos', async () => {
    const busca = await buscaFeitaCom(consulta({ emAtraso: true }));
    const regras = busca.where?.AND as Prisma.TicketWhereInput[];

    expect(regras).toHaveLength(1);
    expect(regras[0].primeiraRespostaEm).toBeNull();
    expect(regras[0].status).toEqual({ not: 'RESOLVIDO' });
    // Uma cláusula por prioridade: o prazo varia por linha, e não dá para
    // escrever isso como um único `lt`.
    expect(regras[0].OR).toHaveLength(3);
  });

  // O caso que motivou o AND. Com os filtros espalhados no mesmo objeto,
  // `status` e `whereEmAberto()` disputavam a chave `status` e um sumia.
  it('status e emAberto convivem, em vez de um apagar o outro', async () => {
    const busca = await buscaFeitaCom(
      consulta({ status: 'ABERTO', emAberto: true }),
    );

    expect(busca.where?.AND).toEqual([
      { status: 'ABERTO' },
      { status: { not: 'RESOLVIDO' } },
    ]);
    expect(busca.where?.status).toBeUndefined();
  });

  it('empresa escolhida na tela continua sendo filtro de primeiro nível', async () => {
    const busca = await buscaFeitaCom(
      consulta({ empresaId: 'e1', emAtraso: true }),
    );
    expect(busca.where?.empresaId).toBe('e1');
    expect(busca.where?.AND).toHaveLength(1);
  });
});

// A tela troca a linha pela resposta da API depois de registrar resposta ou
// mudar status. Com uma rota devolvendo empresa e outra não, a linha perdia o
// nome do cliente no clique e só voltava com F5.
describe('TicketsService, forma da resposta', () => {
  function comTicketExistente(espiao: Espiao) {
    (espiao.prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      abertoEm: new Date(),
      prioridade: 2,
      primeiraRespostaEm: null,
      status: 'ABERTO',
    });
    return new TicketsService(espiao.prisma);
  }

  it('registrar resposta devolve a empresa junto', async () => {
    const espiao = criarMockPrisma();
    const resultado = await comTicketExistente(espiao).responder('t1');

    expect(espiao.atualizacoes[0].include).toEqual(EMPRESA_ENXUTA);
    expect(resultado.empresa).toEqual({ id: 'e1', nome: 'Opella' });
  });

  it('mudar status devolve a empresa junto', async () => {
    const espiao = criarMockPrisma();
    const resultado = await comTicketExistente(espiao).updateStatus('t1', {
      status: 'RESOLVIDO',
    });

    expect(espiao.atualizacoes[0].include).toEqual(EMPRESA_ENXUTA);
    expect(resultado.empresa).toEqual({ id: 'e1', nome: 'Opella' });
  });
});
