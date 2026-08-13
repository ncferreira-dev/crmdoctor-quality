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
import {
  comCamposCalculados,
  whereEmAberto,
  whereEmAtraso,
} from './tickets.utils';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // Só o suficiente para a lista dizer de quem é o chamado. A empresa inteira
  // traria segmento, contato, telefone e e-mail para dentro de toda linha de
  // uma tela que não mostra nada disso.
  private static readonly EMPRESA_NA_LISTA = {
    select: { id: true, nome: true },
  } as const;

  async findAll(query: FindTicketsQueryDto) {
    // Os filtros entram por AND, e não espalhados no mesmo objeto, porque
    // `status` e `whereEmAberto()` escrevem a MESMA chave: espalhados, o último
    // apagava o primeiro em silêncio e a resposta ignorava um filtro que a
    // pessoa tinha escolhido na tela.
    const where: Prisma.TicketWhereInput = {
      empresaId: query.empresaId,
      // A extensão do Prisma injeta `excluidoEm: null` no where DE CIMA, que
      // aqui é o do ticket. A empresa entra por relação e fica de fora desse
      // filtro, então o chamado de uma empresa excluída continuaria aparecendo
      // na tela de Chamados, com o nome de um cliente que não existe mais. É a
      // mesma classe do item 39 do ENTREGA.md, agora pelo lado do `where`.
      empresa: { excluidoEm: null },
      AND: [
        ...(query.status ? [{ status: query.status }] : []),
        ...(query.emAberto ? [whereEmAberto()] : []),
        ...(query.emAtraso ? [whereEmAtraso()] : []),
      ],
    };

    const resultado = await paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.ticket.findMany({
          where,
          // Prioridade antes de data: numa tela que atende chamado, o alto de
          // ontem importa mais que o baixo de hoje. O desempate por data mantém
          // a ordem previsível dentro de cada prioridade.
          orderBy: [{ prioridade: 'asc' }, { abertoEm: 'desc' }],
          include: { empresa: TicketsService.EMPRESA_NA_LISTA },
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
      include: { empresa: TicketsService.EMPRESA_NA_LISTA },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }
    return ticket;
  }

  // Toda rota que devolve um ticket devolve a empresa junto, e não só a lista.
  //
  // A tela de Chamados mostra o nome do cliente em cada linha e troca o item
  // pela resposta da API depois de registrar resposta ou mudar status. Com uma
  // rota devolvendo empresa e outra não, a linha perdia o nome do cliente no
  // clique e só voltava com F5. Forma única de resposta é mais barato que
  // lembrar, em cada tela, qual rota vem enxuta.
  async create(dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        ...dto,
        abertoEm: dto.abertoEm ? new Date(dto.abertoEm) : new Date(),
      },
      include: { empresa: TicketsService.EMPRESA_NA_LISTA },
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
      include: { empresa: TicketsService.EMPRESA_NA_LISTA },
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
      include: { empresa: TicketsService.EMPRESA_NA_LISTA },
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
      include: { empresa: TicketsService.EMPRESA_NA_LISTA },
    });
    return comCamposCalculados(atualizado);
  }
}
