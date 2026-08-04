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

    const comNomes = await this.comQuemRegistrou(
      resultado.data.map(comCamposCalculados),
    );
    return { ...resultado, data: comNomes };
  }

  async findOne(id: string) {
    const ticket = await this.buscarOuFalhar(id);
    const [comNome] = await this.comQuemRegistrou([
      comCamposCalculados(ticket),
    ]);
    return comNome;
  }

  // Quem registrou o chamado no sistema. `criadoPorId` vem da extensão de
  // auditoria e é só uma coluna de texto, sem relação no schema, então o nome
  // é resolvido aqui com uma consulta a mais em vez de um include.
  //
  // ATENÇÃO ao que este campo NÃO é: ele diz quem digitou o ticket no CRM, não
  // quem abriu o chamado do lado do cliente. Essa segunda pessoa não tem campo
  // no modelo hoje.
  private async comQuemRegistrou<T extends { criadoPorId?: string | null }>(
    tickets: T[],
  ): Promise<(T & { registradoPor: { id: string; nome: string } | null })[]> {
    const ids = [...new Set(tickets.map((t) => t.criadoPorId).filter(Boolean))];
    if (ids.length === 0) {
      return tickets.map((t) => ({ ...t, registradoPor: null }));
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids as string[] } },
      select: { id: true, nome: true },
    });
    const porId = new Map(users.map((u) => [u.id, u]));

    return tickets.map((t) => ({
      ...t,
      registradoPor: (t.criadoPorId && porId.get(t.criadoPorId)) || null,
    }));
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
