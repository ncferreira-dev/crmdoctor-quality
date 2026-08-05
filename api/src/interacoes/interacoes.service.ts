import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteracaoDto } from './dto/create-interacao.dto';
import { FindInteracoesQueryDto } from './dto/find-interacoes-query.dto';
import { paginar } from '../common/utils/paginar';

@Injectable()
export class InteracoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: FindInteracoesQueryDto) {
    const where = {
      leadId: query.leadId,
      empresaId: query.empresaId,
      projetoId: query.projetoId,
    };

    const pagina = await paginar({
      page: query.page,
      limit: query.limit,
      buscar: ({ skip, take }) =>
        this.prisma.interacao.findMany({
          where,
          orderBy: { data: 'desc' },
          skip,
          take,
        }),
      contar: () => this.prisma.interacao.count({ where }),
    });

    return { ...pagina, data: await this.comQuemRegistrou(pagina.data) };
  }

  // Quem registrou o contato. Mesmo desenho já usado em tickets: `criadoPorId`
  // vem da extensão de auditoria e é só uma coluna de texto, sem relação no
  // schema, então o nome sai de uma consulta a mais em vez de um include.
  //
  // Numa linha do tempo isso não é enfeite. "Ligamos e ficou de mandar o
  // dossiê" sem autor obriga a perguntar na equipe quem falou com o cliente, e
  // é justamente essa pergunta que a timeline existe para matar.
  private async comQuemRegistrou<T extends { criadoPorId?: string | null }>(
    interacoes: T[],
  ): Promise<(T & { registradoPor: { id: string; nome: string } | null })[]> {
    const ids = [
      ...new Set(interacoes.map((i) => i.criadoPorId).filter(Boolean)),
    ];
    if (ids.length === 0) {
      return interacoes.map((i) => ({ ...i, registradoPor: null }));
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids as string[] } },
      select: { id: true, nome: true },
    });
    const porId = new Map(users.map((u) => [u.id, u]));

    return interacoes.map((i) => ({
      ...i,
      registradoPor: (i.criadoPorId && porId.get(i.criadoPorId)) || null,
    }));
  }

  async create(dto: CreateInteracaoDto) {
    if (!dto.leadId && !dto.empresaId && !dto.projetoId) {
      throw new BadRequestException(
        'Informe ao menos um vínculo: leadId, empresaId ou projetoId',
      );
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
      });
      if (!lead) throw new NotFoundException('Lead não encontrado');
    }
    if (dto.empresaId) {
      const empresa = await this.prisma.empresaCliente.findUnique({
        where: { id: dto.empresaId },
      });
      if (!empresa) throw new NotFoundException('Empresa não encontrada');
    }
    if (dto.projetoId) {
      const projeto = await this.prisma.projeto.findUnique({
        where: { id: dto.projetoId },
      });
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
