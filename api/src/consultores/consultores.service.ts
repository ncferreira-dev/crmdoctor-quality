import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultorDto } from './dto/create-consultor.dto';
import { UpdateConsultorDto } from './dto/update-consultor.dto';
import { FindConsultoresQueryDto } from './dto/find-consultores-query.dto';
import { paginar } from '../common/utils/paginar';

@Injectable()
export class ConsultoresService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindConsultoresQueryDto) {
    // Até o ValidationPipe global (Prompt 9) transformar query params, ?ativo=
    // chega como string; normalizamos aqui pra não depender da ordem dos prompts.
    const ativo =
      query.ativo === undefined
        ? undefined
        : (query.ativo as unknown as string) !== 'false' && !!query.ativo;
    const where: Prisma.ConsultorWhereInput = {
      ativo,
      ...(query.competenciaId && {
        competencias: { some: { id: query.competenciaId } },
      }),
    };

    return paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.consultor.findMany({
          where,
          include: { competencias: true },
          orderBy: { nome: 'asc' },
          skip,
          take,
        }),
      contar: () => this.prisma.consultor.count({ where }),
    });
  }

  async findOne(id: string) {
    const consultor = await this.prisma.consultor.findUnique({
      where: { id },
      include: { competencias: true },
    });
    if (!consultor) {
      throw new NotFoundException('Consultor não encontrado');
    }
    return consultor;
  }

  create(dto: CreateConsultorDto) {
    const { competenciaIds, ...data } = dto;
    return this.prisma.consultor.create({
      data: {
        ...data,
        competencias: competenciaIds
          ? { connect: competenciaIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { competencias: true },
    });
  }

  async update(id: string, dto: UpdateConsultorDto) {
    await this.findOne(id);
    const { competenciaIds, ...data } = dto;
    return this.prisma.consultor.update({
      where: { id },
      data: {
        ...data,
        competencias: competenciaIds
          ? { set: competenciaIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { competencias: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.consultor.delete({ where: { id } });
  }
}
