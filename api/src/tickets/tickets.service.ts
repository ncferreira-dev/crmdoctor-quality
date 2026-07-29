import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateStatusTicketDto } from './dto/update-status-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { paginar } from '../common/utils/paginar';
import { comCamposCalculados, whereEmAtraso } from './tickets.utils';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: FindTicketsQueryDto) {
    const where: Prisma.TicketWhereInput = {
      status: query.status,
      empresaId: query.empresaId,
      ...(query.emAtraso && whereEmAtraso()),
    };

    const resultado = await paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.ticket.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
          skip,
          take,
        }),
      contar: () => this.prisma.ticket.count({ where }),
    });

    return { ...resultado, data: resultado.data.map(comCamposCalculados) };
  }

  async findOne(id: string) {
    const ticket = await this.buscarOuFalhar(id);
    return comCamposCalculados(ticket);
  }

  private async buscarOuFalhar(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { empresa: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }
    return ticket;
  }

  async create(dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        ...dto,
        abertoEm: dto.abertoEm ? new Date(dto.abertoEm) : new Date(),
      },
    });
    return comCamposCalculados(ticket);
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.buscarOuFalhar(id);
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...dto,
        abertoEm: dto.abertoEm ? new Date(dto.abertoEm) : undefined,
      },
    });
    return comCamposCalculados(ticket);
  }

  async remove(id: string) {
    await this.buscarOuFalhar(id);
    return this.prisma.ticket.delete({ where: { id } });
  }

  async updateStatus(id: string, dto: UpdateStatusTicketDto) {
    await this.buscarOuFalhar(id);
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: dto.status,
        resolvidoEm: dto.status === 'RESOLVIDO' ? new Date() : null,
      },
    });
    return comCamposCalculados(ticket);
  }

  async responder(id: string) {
    const ticket = await this.buscarOuFalhar(id);
    if (ticket.primeiraRespostaEm) {
      throw new ConflictException(
        'Ticket já teve a primeira resposta registrada',
      );
    }
    const atualizado = await this.prisma.ticket.update({
      where: { id },
      data: { primeiraRespostaEm: new Date() },
    });
    return comCamposCalculados(atualizado);
  }
}
