import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { FindEmpresasQueryDto } from './dto/find-empresas-query.dto';
import { paginar } from '../common/utils/paginar';
import { whereEmAberto } from '../tickets/tickets.utils';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindEmpresasQueryDto) {
    const where: Prisma.EmpresaClienteWhereInput = {
      segmento: query.segmento,
      ...(query.busca && {
        OR: [
          { nome: { contains: query.busca, mode: 'insensitive' } },
          { cnpj: { contains: query.busca, mode: 'insensitive' } },
        ],
      }),
    };

    return paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.empresaCliente.findMany({
          where,
          orderBy: { nome: 'asc' },
          skip,
          take,
        }),
      contar: () => this.prisma.empresaCliente.count({ where }),
    });
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresaCliente.findUnique({
      where: { id },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const [projetosCount, ticketsAbertosCount, proximaVisita] =
      await Promise.all([
        this.prisma.projeto.count({ where: { empresaId: id } }),
        // Mesma definição de "em aberto" que o dashboard usa. Ver whereEmAberto.
        this.prisma.ticket.count({
          where: { empresaId: id, ...whereEmAberto() },
        }),
        this.prisma.visita.findFirst({
          where: {
            empresaId: id,
            status: { not: 'CANCELADA' },
            inicio: { gte: new Date() },
          },
          orderBy: { inicio: 'asc' },
        }),
      ]);

    return {
      ...empresa,
      _count: { projetos: projetosCount, ticketsAbertos: ticketsAbertosCount },
      proximaVisita,
    };
  }

  create(dto: CreateEmpresaDto) {
    return this.prisma.empresaCliente.create({ data: dto });
  }

  async update(id: string, dto: UpdateEmpresaDto) {
    await this.garantirExiste(id);
    return this.prisma.empresaCliente.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.garantirExiste(id);
    return this.prisma.empresaCliente.delete({ where: { id } });
  }

  private async garantirExiste(id: string) {
    const empresa = await this.prisma.empresaCliente.findUnique({
      where: { id },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return empresa;
  }
}
