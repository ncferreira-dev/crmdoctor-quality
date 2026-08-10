import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { FindEmpresasQueryDto } from './dto/find-empresas-query.dto';
import { paginar } from '../common/utils/paginar';
import { whereEmAberto } from '../tickets/tickets.utils';

// O `target` do P2002 vem como string em um banco e como lista de colunas em
// outro. Ler os dois jeitos evita que a mensagem amigável dependa da forma do
// driver.
function alvoDoIndice(target: unknown): string[] {
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [target];
  return [];
}

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

  async create(dto: CreateEmpresaDto) {
    return this.comCnpjUnico(() =>
      this.prisma.empresaCliente.create({ data: dto }),
    );
  }

  async update(id: string, dto: UpdateEmpresaDto) {
    await this.garantirExiste(id);
    return this.comCnpjUnico(() =>
      this.prisma.empresaCliente.update({ where: { id }, data: dto }),
    );
  }

  // O índice único do CNPJ já existia no banco, mas estourava como erro cru do
  // Prisma: a tela mostrava "Internal server error" para o caso mais comum de
  // todos, que é cadastrar de novo um cliente que já está lá. Aqui ele vira a
  // frase que diz o que fazer.
  private async comCnpjUnico<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002' &&
        alvoDoIndice(erro.meta?.target).includes('cnpj')
      ) {
        throw new ConflictException(
          'Já existe uma empresa cadastrada com este CNPJ.',
        );
      }
      throw erro;
    }
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
