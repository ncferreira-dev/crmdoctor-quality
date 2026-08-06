import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { AuthUser } from '../common/types/auth-user';
import { exigirNivelMenor } from '../common/rbac/exigir-nivel-menor';
import { PERMISSOES, Permissao } from '../common/constants/permissoes';

const VALIDAS = new Set<string>(PERMISSOES);

// Descarta string que já não é permissão. Aposentar uma permissão do código não
// a apaga das linhas de cargo já gravadas, e a sobra não fica quieta: a tela de
// Cargos monta o formulário com o que veio da API e devolve a lista inteira ao
// salvar, inclusive o que ela não desenha. A string morta volta no PATCH, o
// @IsIn do DTO a recusa, e editar qualquer cargo passa a dar 400.
//
// Foi o que aconteceu com CONSULTORES_READ e CONSULTORES_WRITE, apagadas em
// 04/08/2026 junto com o módulo de consultores: elas continuaram nos cargos do
// banco e travaram a tela de Cargos por inteiro, sem ninguém notar até alguém
// precisar editar um cargo.
//
// A limpeza fica na leitura, não na escrita: o DTO tem que continuar recusando
// permissão inventada, senão erro de digitação vira silêncio. Aqui a API só
// deixa de anunciar o que ela própria já não reconhece. Efeito colateral bom:
// o primeiro save de cada cargo regrava a linha sem a sobra.
function semPermissoesMortas<T extends { permissoes: string[] }>(cargo: T): T {
  return {
    ...cargo,
    permissoes: cargo.permissoes.filter((p): p is Permissao => VALIDAS.has(p)),
  };
}

@Injectable()
export class CargosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const cargos = await this.prisma.cargo.findMany({
      orderBy: { nivel: 'desc' },
    });
    return cargos.map(semPermissoesMortas);
  }

  async findOne(id: string) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id } });
    if (!cargo) {
      throw new NotFoundException('Cargo não encontrado');
    }
    return semPermissoesMortas(cargo);
  }

  create(dto: CreateCargoDto, requestUser: AuthUser) {
    exigirNivelMenor(
      dto.nivel,
      requestUser,
      'Não é possível criar um cargo de nível igual ou maior que o seu',
    );
    return this.prisma.cargo.create({ data: dto });
  }

  async update(id: string, dto: UpdateCargoDto, requestUser: AuthUser) {
    const cargo = await this.findOne(id);

    exigirNivelMenor(
      cargo.nivel,
      requestUser,
      'Não é possível editar um cargo de nível igual ou maior que o seu',
    );
    if (dto.nivel !== undefined) {
      exigirNivelMenor(
        dto.nivel,
        requestUser,
        'Não é possível definir um nível igual ou maior que o seu',
      );
    }

    return this.prisma.cargo.update({ where: { id }, data: dto });
  }

  async remove(id: string, requestUser: AuthUser) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      include: { usuarios: true },
    });
    if (!cargo) {
      throw new NotFoundException('Cargo não encontrado');
    }
    exigirNivelMenor(
      cargo.nivel,
      requestUser,
      'Não é possível excluir um cargo de nível igual ou maior que o seu',
    );
    if (cargo.usuarios.length > 0) {
      throw new ConflictException('Cargo possui usuários vinculados');
    }

    return this.prisma.cargo.delete({ where: { id } });
  }
}
