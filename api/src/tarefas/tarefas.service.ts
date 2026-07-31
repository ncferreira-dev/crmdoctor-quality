import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { UpdateTarefaDto } from './dto/update-tarefa.dto';
import { FindTarefasQueryDto } from './dto/find-tarefas-query.dto';
import { paginar } from '../common/utils/paginar';

const INCLUDE_PADRAO = {
  responsavel: { select: { id: true, nome: true, email: true } },
  projeto: { select: { id: true, titulo: true } },
};

@Injectable()
export class TarefasService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindTarefasQueryDto) {
    const where: Prisma.TarefaWhereInput = {
      responsavelId: query.responsavelId,
      projetoId: query.projetoId,
      status: query.status,
    };

    return paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.tarefa.findMany({
          where,
          include: INCLUDE_PADRAO,
          // Pendentes com prazo mais próximo primeiro; sem prazo vai pro fim.
          orderBy: [{ status: 'asc' }, { prazo: 'asc' }],
          skip,
          take,
        }),
      contar: () => this.prisma.tarefa.count({ where }),
    });
  }

  async findOne(id: string) {
    const tarefa = await this.prisma.tarefa.findUnique({
      where: { id },
      include: INCLUDE_PADRAO,
    });
    if (!tarefa) {
      throw new NotFoundException('Tarefa não encontrada');
    }
    return tarefa;
  }

  create(dto: CreateTarefaDto) {
    return this.prisma.tarefa.create({
      data: {
        ...dto,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
      },
      include: INCLUDE_PADRAO,
    });
  }

  async update(id: string, dto: UpdateTarefaDto) {
    await this.findOne(id);
    return this.prisma.tarefa.update({
      where: { id },
      data: {
        ...dto,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        // Concluir carimba a data; reabrir limpa. Sem isso o histórico mentiria.
        concluidaEm:
          dto.status === 'CONCLUIDA'
            ? new Date()
            : dto.status !== undefined
              ? null
              : undefined,
      },
      include: INCLUDE_PADRAO,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tarefa.delete({ where: { id } });
  }
}
