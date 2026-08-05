import { ProjetosService } from './projetos.service';
import { PrismaService } from '../prisma/prisma.service';
import { FindProjetosQueryDto } from './dto/find-projetos-query.dto';
import type { AuthUser } from '../common/types/auth-user';
import type { Permissao } from '../common/constants/permissoes';

// O que estes testes protegem: valor de contrato é o dado mais sensível do
// sistema, e a regra do Nícolas é que só ele e o CEO vejam. Esconder no front
// não serviria: o número continuaria viajando na resposta e apareceria para
// quem abrisse o inspecionar do navegador. Aqui se prova que a API não devolve.
function criarMockPrisma() {
  return {
    projeto: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  };
}

type MockPrisma = ReturnType<typeof criarMockPrisma>;

function servicoCom(prisma: MockPrisma) {
  return new ProjetosService(prisma as unknown as PrismaService);
}

function usuario(permissoes: Permissao[]): AuthUser {
  return {
    sub: 'u1',
    nome: 'Fulano',
    email: 'f@teste.com',
    cargoNivel: 60,
    permissoes,
  };
}

const query = { page: 1, limit: 20 } as FindProjetosQueryDto;

describe('ProjetosService, valor do contrato', () => {
  describe('findAll', () => {
    it('devolve o valor para quem tem FINANCEIRO_READ', async () => {
      const prisma = criarMockPrisma();
      prisma.projeto.findMany.mockResolvedValue([{ id: 'p1', valor: '85000' }]);
      prisma.projeto.count.mockResolvedValue(1);

      const r = await servicoCom(prisma).findAll(
        query,
        usuario(['PROJETOS_READ', 'FINANCEIRO_READ']),
      );

      expect(r.data[0].valor).toBe('85000');
    });

    it('zera o valor para quem NÃO tem, e devolve o resto do projeto', async () => {
      const prisma = criarMockPrisma();
      prisma.projeto.findMany.mockResolvedValue([
        { id: 'p1', titulo: 'Validação de limpeza', valor: '85000' },
      ]);
      prisma.projeto.count.mockResolvedValue(1);

      const r = await servicoCom(prisma).findAll(
        query,
        usuario(['PROJETOS_READ']),
      );

      expect(r.data[0].valor).toBeNull();
      // O projeto continua utilizável: quem toca a obra precisa do resto.
      expect(r.data[0].titulo).toBe('Validação de limpeza');
    });

    it('sem usuário nenhum, esconde: o padrão é o mais fechado', async () => {
      const prisma = criarMockPrisma();
      prisma.projeto.findMany.mockResolvedValue([{ id: 'p1', valor: '85000' }]);
      prisma.projeto.count.mockResolvedValue(1);

      const r = await servicoCom(prisma).findAll(query);

      expect(r.data[0].valor).toBeNull();
    });
  });

  describe('findOne', () => {
    it('esconde o valor de quem não pode ver', async () => {
      const prisma = criarMockPrisma();
      prisma.projeto.findUnique.mockResolvedValue({
        id: 'p1',
        titulo: 'Adequação de BPF',
        valor: '56000',
      });

      const r = await servicoCom(prisma).findOne(
        'p1',
        usuario(['PROJETOS_READ']),
      );

      expect(r.valor).toBeNull();
      expect(r.titulo).toBe('Adequação de BPF');
    });

    it('mostra para quem pode', async () => {
      const prisma = criarMockPrisma();
      prisma.projeto.findUnique.mockResolvedValue({ id: 'p1', valor: '56000' });

      const r = await servicoCom(prisma).findOne(
        'p1',
        usuario(['PROJETOS_READ', 'FINANCEIRO_READ']),
      );

      expect(r.valor).toBe('56000');
    });
  });
});
