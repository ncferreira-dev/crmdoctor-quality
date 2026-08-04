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

// Consultor aqui é um User — nunca incluir o registro inteiro (viria com
// senhaHash e codigoConvite). Só os campos que a agenda mostra.
const SELECT_CONSULTOR = {
  id: true,
  nome: true,
  email: true,
  especialidade: true,
};

// O que a agenda precisa saber do projeto: como se chama e quando vence. Não
// vale trazer o projeto inteiro (descrição, valor) para dentro de cada bloco
// do calendário.
const SELECT_PROJETO = {
  id: true,
  titulo: true,
  estagio: true,
  dataLimiteCompliance: true,
};

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
          include: {
            consultor: { select: SELECT_CONSULTOR },
            empresa: true,
            projeto: { select: SELECT_PROJETO },
          },
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
      include: {
        consultor: { select: SELECT_CONSULTOR },
        empresa: true,
        projeto: { select: SELECT_PROJETO },
      },
    });
    if (!visita) {
      throw new NotFoundException('Visita não encontrada');
    }
    return visita;
  }

  // Lista enxuta para popular o seletor de consultor no formulário de visita.
  // Gate é VISITAS_READ (não USUARIOS_READ): quem monta a agenda precisa
  // dessa lista mesmo sem enxergar o cadastro de membros inteiro.
  consultoresDisponiveis() {
    return this.prisma.user.findMany({
      where: { ativo: true, cargo: { permissoes: { has: 'VISITAS_WRITE' } } },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
  }

  async create(dto: CreateVisitaDto) {
    const { inicio, fim } = this.validarPeriodo(dto.inicio, dto.fim);
    await this.validarProjetoDaEmpresa(dto.projetoId, dto.empresaId);
    return this.prisma.visita.create({ data: { ...dto, inicio, fim } });
  }

  async update(id: string, dto: UpdateVisitaDto) {
    const atual = await this.findOne(id);
    const { inicio, fim } = this.validarPeriodo(
      dto.inicio ?? atual.inicio.toISOString(),
      dto.fim ?? atual.fim.toISOString(),
    );
    // A empresa da visita pode estar mudando no mesmo PATCH: valida o projeto
    // contra a empresa que vai valer depois da edição, não contra a de antes.
    await this.validarProjetoDaEmpresa(
      dto.projetoId,
      dto.empresaId ?? atual.empresaId,
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

  // Uma visita da empresa A não pode executar um projeto da empresa B. O banco
  // não tem como garantir isso (são duas chaves estrangeiras independentes),
  // então a regra vive aqui. `undefined` = campo não veio no PATCH; `null` =
  // desvincular de propósito. Nenhum dos dois precisa de checagem.
  private async validarProjetoDaEmpresa(
    projetoId: string | null | undefined,
    empresaId: string,
  ) {
    if (!projetoId) return;

    const projeto = await this.prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { empresaId: true },
    });
    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado');
    }
    if (projeto.empresaId !== empresaId) {
      throw new BadRequestException(
        'O projeto selecionado é de outra empresa. Escolha um projeto da empresa da visita.',
      );
    }
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
