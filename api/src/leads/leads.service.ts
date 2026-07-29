import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateEstagioDto } from './dto/update-estagio.dto';
import { FindLeadsQueryDto } from './dto/find-leads-query.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindLeadsQueryDto) {
    const where: Prisma.LeadWhereInput = {
      estagio: query.estagio,
      segmento: query.segmento,
      ...(query.busca && {
        OR: [
          { nome: { contains: query.busca, mode: 'insensitive' } },
          { empresaNome: { contains: query.busca, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.lead.findMany({ where, orderBy: { criadoEm: 'desc' } });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { interacoes: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }
    return lead;
  }

  create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: dto });
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.lead.delete({ where: { id } });
  }

  async updateEstagio(id: string, dto: UpdateEstagioDto) {
    await this.findOne(id);
    return this.prisma.lead.update({ where: { id }, data: { estagio: dto.estagio } });
  }

  async converter(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { empresaCliente: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }
    if (lead.empresaCliente) {
      throw new ConflictException('Lead já foi convertido em empresa');
    }
    if (!lead.segmento) {
      throw new BadRequestException('Defina o segmento do lead antes de converter');
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresaCliente.create({
        data: {
          nome: lead.empresaNome ?? lead.nome,
          segmento: lead.segmento!,
          contatoNome: lead.nome,
          email: lead.email,
          telefone: lead.telefone,
          leadOrigemId: lead.id,
        },
      });

      await tx.lead.update({ where: { id: lead.id }, data: { estagio: 'GANHO' } });

      return empresa;
    });
  }
}
