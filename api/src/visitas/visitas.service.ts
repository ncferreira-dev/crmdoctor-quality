import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { UpdateVisitaDto } from './dto/update-visita.dto';
import { FindVisitasQueryDto } from './dto/find-visitas-query.dto';
import { paginar } from '../common/utils/paginar';

@Injectable()
export class VisitasService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindVisitasQueryDto) {
    const where = {
      consultorId: query.consultorId,
      empresaId: query.empresaId,
      inicio: {
        gte: query.de ? new Date(query.de) : undefined,
        lte: query.ate ? new Date(query.ate) : undefined,
      },
    };

    return paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.visita.findMany({
          where,
          include: { consultor: true, empresa: true },
          orderBy: { inicio: 'asc' },
          skip,
          take,
        }),
      contar: () => this.prisma.visita.count({ where }),
    });
  }

  async findOne(id: string) {
    const visita = await this.prisma.visita.findUnique({
      where: { id },
      include: { consultor: true, empresa: true },
    });
    if (!visita) {
      throw new NotFoundException('Visita não encontrada');
    }
    return visita;
  }

  create(dto: CreateVisitaDto) {
    const { inicio, fim } = this.validarPeriodo(dto.inicio, dto.fim);
    return this.prisma.visita.create({ data: { ...dto, inicio, fim } });
  }

  async update(id: string, dto: UpdateVisitaDto) {
    const atual = await this.findOne(id);
    const { inicio, fim } = this.validarPeriodo(
      dto.inicio ?? atual.inicio.toISOString(),
      dto.fim ?? atual.fim.toISOString(),
    );
    return this.prisma.visita.update({
      where: { id },
      data: { ...dto, inicio, fim },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.visita.delete({ where: { id } });
  }

  // Hoje só validamos o range (fim > inicio) em código. A trava de conflito
  // de horário por consultor (exclusion constraint com btree_gist) fica
  // preparada no schema.prisma mas não ativada — ver comentário no model Visita.
  private validarPeriodo(inicioStr: string, fimStr: string) {
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      throw new BadRequestException(
        'inicio e fim devem ser datas ISO 8601 válidas',
      );
    }
    if (fim <= inicio) {
      throw new BadRequestException('fim deve ser depois de inicio');
    }

    return { inicio, fim };
  }
}
