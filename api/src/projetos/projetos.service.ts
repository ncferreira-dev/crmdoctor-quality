import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { UpdateEstagioProjetoDto } from './dto/update-estagio-projeto.dto';
import { FindProjetosQueryDto } from './dto/find-projetos-query.dto';
import { paginar } from '../common/utils/paginar';
import { AuthUser } from '../common/types/auth-user';

// Nunca `include: { equipe: true }` cru: User carrega senhaHash e codigoConvite,
// e foi exatamente assim que o código de convite vazou em /users uma vez. Quatro
// campos, escolhidos à mão.
const EQUIPE_ENXUTA = {
  select: { id: true, nome: true, email: true, especialidade: true },
} as const;

// Tira o valor do contrato de quem não pode vê-lo. Devolve null em vez de
// omitir a chave: o front distingue "não tem valor cadastrado" de "não posso
// ver", e omitir faria os dois casos virarem undefined.
function semValorSePreciso<T extends { valor: unknown }>(
  registro: T,
  user?: AuthUser,
): T {
  const pode = user?.permissoes?.includes('FINANCEIRO_READ') ?? false;
  return pode ? registro : { ...registro, valor: null };
}

@Injectable()
export class ProjetosService {
  constructor(private prisma: PrismaService) {}

  // Separa equipeIds do resto: ele não é coluna da tabela projetos, é relação, e
  // o Prisma pede a forma { set: [...] }. `undefined` significa "não mexi na
  // equipe" e array vazio significa "esvaziei", que são coisas diferentes.
  private separarEquipe<T extends { equipeIds?: string[] }>(dto: T) {
    const { equipeIds, ...campos } = dto;
    const equipe =
      equipeIds === undefined
        ? undefined
        : { set: equipeIds.map((id) => ({ id })) };
    return { campos, equipe };
  }

  async findAll(query: FindProjetosQueryDto, user?: AuthUser) {
    const where = { empresaId: query.empresaId, estagio: query.estagio };

    const pagina = await paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.projeto.findMany({
          where,
          // A listagem mostra de qual empresa é cada projeto; sem o include a
          // tela teria que fazer N chamadas para resolver os nomes.
          include: { empresa: true, equipe: EQUIPE_ENXUTA },
          orderBy: { criadoEm: 'desc' },
          skip,
          take,
        }),
      contar: () => this.prisma.projeto.count({ where }),
    });

    return {
      ...pagina,
      data: pagina.data.map((p) => semValorSePreciso(p, user)),
    };
  }

  async findOne(id: string, user?: AuthUser) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: {
        empresa: true,
        // `where: { excluidoEm: null }` em toda relação que tem soft delete, e
        // isto NÃO é redundante: a extensão do Prisma filtra a consulta de
        // cima, e não o que vem por `include`. Medido em 10/08/2026: um marco
        // apagado pela tela continuava aparecendo na tela do projeto.
        interacoes: { where: { excluidoEm: null } },
        // O responsável vem junto porque a tela do projeto mostra o nome, e
        // sem isto ela teria só o id: um marco com dono viraria "sem dono" na
        // leitura, e é justamente esse campo que alimenta a carga por pessoa.
        etapas: {
          where: { excluidoEm: null },
          orderBy: { ordem: 'asc' },
          include: { responsavel: { select: { id: true, nome: true } } },
        },
        equipe: EQUIPE_ENXUTA,
      },
    });
    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return semValorSePreciso(projeto, user);
  }

  create(dto: CreateProjetoDto) {
    const { campos, equipe } = this.separarEquipe(dto);
    return this.prisma.projeto.create({
      data: {
        ...campos,
        dataLimiteCompliance: campos.dataLimiteCompliance
          ? new Date(campos.dataLimiteCompliance)
          : undefined,
        ...(equipe ? { equipe: { connect: equipe.set } } : {}),
      },
      include: { equipe: EQUIPE_ENXUTA },
    });
  }

  async update(id: string, dto: UpdateProjetoDto) {
    await this.garantirQueExiste(id);
    const { campos, equipe } = this.separarEquipe(dto);
    return this.prisma.projeto.update({
      where: { id },
      data: {
        ...campos,
        dataLimiteCompliance: campos.dataLimiteCompliance
          ? new Date(campos.dataLimiteCompliance)
          : undefined,
        ...(equipe ? { equipe } : {}),
      },
      include: { equipe: EQUIPE_ENXUTA },
    });
  }

  // Só confere existência. Separado do findOne para as escritas não passarem
  // pelo filtro de valor: ali o usuário não está pedindo para LER o projeto.
  private async garantirQueExiste(id: string) {
    const existe = await this.prisma.projeto.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async remove(id: string) {
    await this.garantirQueExiste(id);
    return this.prisma.projeto.delete({ where: { id } });
  }

  async updateEstagio(id: string, dto: UpdateEstagioProjetoDto) {
    await this.garantirQueExiste(id);
    return this.prisma.projeto.update({
      where: { id },
      data: { estagio: dto.estagio },
    });
  }
}
