import { CargosService } from './cargos.service';
import { PrismaService } from '../prisma/prisma.service';

// O que estes testes protegem: a tela de Cargos devolve no PATCH a mesma lista
// de permissões que recebeu no GET, inclusive o que ela não desenha. Então toda
// string morta que a API anuncia volta para o DTO e é recusada pelo @IsIn, e
// editar cargo nenhum funciona mais.
//
// Aconteceu de verdade: CONSULTORES_READ e CONSULTORES_WRITE saíram do código
// em 04/08/2026 e ficaram nas linhas de cargo da produção. A tela de Cargos
// passou a dar 400 em qualquer save, e o defeito só apareceu quando alguém
// precisou conceder uma permissão nova.
function criarMockPrisma() {
  return {
    cargo: { findMany: jest.fn(), findUnique: jest.fn() },
  };
}

type MockPrisma = ReturnType<typeof criarMockPrisma>;

function servicoCom(prisma: MockPrisma) {
  return new CargosService(prisma as unknown as PrismaService);
}

describe('CargosService, permissões aposentadas', () => {
  it('findAll não devolve string que já não é permissão', async () => {
    const prisma = criarMockPrisma();
    prisma.cargo.findMany.mockResolvedValue([
      {
        id: 'c1',
        nome: 'CEO',
        nivel: 100,
        permissoes: [
          'PROJETOS_READ',
          'CONSULTORES_READ',
          'CONSULTORES_WRITE',
          'FINANCEIRO_READ',
        ],
      },
    ]);

    const [cargo] = await servicoCom(prisma).findAll();

    expect(cargo.permissoes).toEqual(['PROJETOS_READ', 'FINANCEIRO_READ']);
  });

  it('findOne não devolve string que já não é permissão', async () => {
    const prisma = criarMockPrisma();
    prisma.cargo.findUnique.mockResolvedValue({
      id: 'c1',
      nome: 'Analista',
      nivel: 40,
      permissoes: ['TAREFAS_READ', 'CONSULTORES_READ'],
    });

    const cargo = await servicoCom(prisma).findOne('c1');

    expect(cargo.permissoes).toEqual(['TAREFAS_READ']);
  });

  // A ordem e o conteúdo do que é válido não podem ser mexidos de lambuja: a
  // limpeza tira o que morreu e não reordena nem inventa o resto.
  it('preserva as permissões vivas como estavam', async () => {
    const prisma = criarMockPrisma();
    const vivas = ['TICKETS_WRITE', 'EMPRESAS_READ', 'DASHBOARD_READ'];
    prisma.cargo.findUnique.mockResolvedValue({
      id: 'c1',
      nome: 'Coordenador',
      nivel: 60,
      permissoes: vivas,
    });

    const cargo = await servicoCom(prisma).findOne('c1');

    expect(cargo.permissoes).toEqual(vivas);
  });
});
