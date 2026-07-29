import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetenciaDto } from './dto/create-competencia.dto';
import { UpdateCompetenciaDto } from './dto/update-competencia.dto';
import { FindCompetenciasQueryDto } from './dto/find-competencias-query.dto';
import { paginar } from '../common/utils/paginar';

@Injectable()
export class CompetenciasService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindCompetenciasQueryDto) {
    return paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.competencia.findMany({
          orderBy: { nome: 'asc' },
          skip,
          take,
        }),
      contar: () => this.prisma.competencia.count(),
    });
  }

  async findOne(id: string) {
    const competencia = await this.prisma.competencia.findUnique({
      where: { id },
    });
    if (!competencia) {
      throw new NotFoundException('Competência não encontrada');
    }
    return competencia;
  }

  create(dto: CreateCompetenciaDto) {
    return this.prisma.competencia.create({ data: dto });
  }

  async update(id: string, dto: UpdateCompetenciaDto) {
    await this.findOne(id);
    return this.prisma.competencia.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.competencia.delete({ where: { id } });
  }
}
