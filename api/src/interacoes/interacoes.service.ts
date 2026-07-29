import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteracaoDto } from './dto/create-interacao.dto';
import { FindInteracoesQueryDto } from './dto/find-interacoes-query.dto';

@Injectable()
export class InteracoesService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindInteracoesQueryDto) {
    return this.prisma.interacao.findMany({
      where: {
        leadId: query.leadId,
        empresaId: query.empresaId,
        projetoId: query.projetoId,
      },
      orderBy: { data: 'desc' },
    });
  }

  async create(dto: CreateInteracaoDto) {
    if (!dto.leadId && !dto.empresaId && !dto.projetoId) {
      throw new BadRequestException('Informe ao menos um vínculo: leadId, empresaId ou projetoId');
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
      if (!lead) throw new NotFoundException('Lead não encontrado');
    }
    if (dto.empresaId) {
      const empresa = await this.prisma.empresaCliente.findUnique({ where: { id: dto.empresaId } });
      if (!empresa) throw new NotFoundException('Empresa não encontrada');
    }
    if (dto.projetoId) {
      const projeto = await this.prisma.projeto.findUnique({ where: { id: dto.projetoId } });
      if (!projeto) throw new NotFoundException('Projeto não encontrado');
    }

    return this.prisma.interacao.create({
      data: {
        tipo: dto.tipo,
        resumo: dto.resumo,
        data: dto.data ? new Date(dto.data) : undefined,
        leadId: dto.leadId,
        empresaId: dto.empresaId,
        projetoId: dto.projetoId,
      },
    });
  }
}
