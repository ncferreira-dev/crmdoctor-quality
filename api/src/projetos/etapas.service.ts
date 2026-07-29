import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { UpdateEtapaDto } from './dto/update-etapa.dto';

@Injectable()
export class EtapasService {
  constructor(private prisma: PrismaService) {}

  private async garantirProjeto(projetoId: string) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });
    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado');
    }
  }

  async findAllByProjeto(projetoId: string) {
    await this.garantirProjeto(projetoId);
    return this.prisma.etapaProjeto.findMany({
      where: { projetoId },
      orderBy: { ordem: 'asc' },
    });
  }

  async create(projetoId: string, dto: CreateEtapaDto) {
    await this.garantirProjeto(projetoId);
    return this.prisma.etapaProjeto.create({
      data: {
        ...dto,
        projetoId,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
      },
    });
  }

  async findOne(id: string) {
    const etapa = await this.prisma.etapaProjeto.findUnique({ where: { id } });
    if (!etapa) {
      throw new NotFoundException('Etapa não encontrada');
    }
    return etapa;
  }

  async update(id: string, dto: UpdateEtapaDto) {
    await this.findOne(id);
    const data = {
      ...dto,
      prazo: dto.prazo ? new Date(dto.prazo) : undefined,
    } as Prisma.EtapaProjetoUncheckedUpdateInput;
    if (dto.status !== undefined) {
      data.concluidaEm = dto.status === 'CONCLUIDA' ? new Date() : null;
    }
    return this.prisma.etapaProjeto.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.etapaProjeto.delete({ where: { id } });
  }
}
