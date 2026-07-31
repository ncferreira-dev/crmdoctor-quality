import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { UpdateEstagioProjetoDto } from './dto/update-estagio-projeto.dto';
import { FindProjetosQueryDto } from './dto/find-projetos-query.dto';
import { paginar } from '../common/utils/paginar';

@Injectable()
export class ProjetosService {
  constructor(private prisma: PrismaService) {}

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
          include: { empresa: true },
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
      },
    });
    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return projeto;
  }

  create(dto: CreateProjetoDto) {
    return this.prisma.projeto.create({
      data: {
        ...dto,
        dataLimiteCompliance: dto.dataLimiteCompliance
          ? new Date(dto.dataLimiteCompliance)
          : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateProjetoDto) {
    await this.findOne(id);
    return this.prisma.projeto.update({
      where: { id },
      data: {
        ...dto,
        dataLimiteCompliance: dto.dataLimiteCompliance
          ? new Date(dto.dataLimiteCompliance)
          : undefined,
      },
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
