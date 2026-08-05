import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { UpdateEstagioProjetoDto } from './dto/update-estagio-projeto.dto';
import { FindProjetosQueryDto } from './dto/find-projetos-query.dto';
import { paginar } from '../common/utils/paginar';

// Nunca `include: { equipe: true }` cru: User carrega senhaHash e codigoConvite,
// e foi exatamente assim que o código de convite vazou em /users uma vez. Quatro
// campos, escolhidos à mão.
const EQUIPE_ENXUTA = {
  select: { id: true, nome: true, email: true, especialidade: true },
} as const;

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

  findAll(query: FindProjetosQueryDto) {
    const where = { empresaId: query.empresaId, estagio: query.estagio };

    return paginar({
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
  }

  async findOne(id: string) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: {
        empresa: true,
        interacoes: true,
        etapas: { orderBy: { ordem: 'asc' } },
        equipe: EQUIPE_ENXUTA,
      },
    });
    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return projeto;
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
    await this.findOne(id);
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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.projeto.delete({ where: { id } });
  }

  async updateEstagio(id: string, dto: UpdateEstagioProjetoDto) {
    await this.findOne(id);
    return this.prisma.projeto.update({
      where: { id },
      data: { estagio: dto.estagio },
    });
  }
}
