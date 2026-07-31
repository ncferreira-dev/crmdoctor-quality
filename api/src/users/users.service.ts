import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResgatarConviteDto } from './dto/resgatar-convite.dto';
import { AuthUser } from '../common/types/auth-user';
import { exigirNivelMenor } from '../common/rbac/exigir-nivel-menor';

// Código de 8 dígitos legível por telefone/WhatsApp. randomInt é do crypto —
// Math.random seria previsível e isso aqui dá acesso a uma conta.
function gerarCodigoConvite(): string {
  return String(randomInt(10_000_000, 100_000_000));
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private semSenha<T extends { senhaHash: string }>(user: T) {
    const { senhaHash: _senhaHash, ...resto } = user;
    return resto;
  }

  private async buscarComCargoOuFalhar(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  private async buscarCargoOuFalhar(id: string) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id } });
    if (!cargo) {
      throw new NotFoundException('Cargo não encontrado');
    }
    return cargo;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { cargo: true },
      orderBy: { nome: 'asc' },
    });
    return users.map((u) => this.semSenha(u));
  }

  async findOne(id: string) {
    const user = await this.buscarComCargoOuFalhar(id);
    return this.semSenha(user);
  }

  async create(dto: CreateUserDto, requestUser: AuthUser) {
    const cargo = await this.buscarCargoOuFalhar(dto.cargoId);
    exigirNivelMenor(
      cargo.nivel,
      requestUser,
      'Não é possível criar um usuário com cargo de nível igual ou maior que o seu',
    );

    const emailEmUso = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (emailEmUso) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const codigoConvite = gerarCodigoConvite();
    const user = await this.prisma.user.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
        // Hash de um segredo aleatório: a conta nasce sem senha utilizável.
        // Enquanto codigoConvite existir, o login por senha é recusado — só o
        // resgate do código define a senha real.
        senhaHash: await argon2.hash(randomUUID()),
        codigoConvite,
        cargoId: dto.cargoId,
        ativo: dto.ativo ?? true,
      },
      include: { cargo: true },
    });

    // O código volta UMA vez, na resposta da criação: é o que quem cadastrou
    // repassa ao novo membro. Depois disso ele não é mais exibido em lugar
    // nenhum (findAll/findOne omitem).
    return { ...this.semSenha(user), codigoConvite };
  }

  // Resgate do primeiro acesso: valida o código e a pessoa define a senha.
  // Rota pública — quem resgata ainda não tem sessão.
  async resgatarConvite(dto: ResgatarConviteDto) {
    const user = await this.prisma.user.findUnique({
      where: { codigoConvite: dto.codigo },
    });
    if (!user || !user.ativo) {
      throw new NotFoundException('Código inválido ou já utilizado');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        senhaHash: await argon2.hash(dto.senha),
        codigoConvite: null,
        senhaDefinidaEm: new Date(),
      },
    });

    return { email: user.email, nome: user.nome };
  }

  // Reemite o código (membro perdeu o convite antes de usar).
  async reenviarConvite(id: string, requestUser: AuthUser) {
    const alvo = await this.buscarComCargoOuFalhar(id);
    exigirNivelMenor(
      alvo.cargo.nivel,
      requestUser,
      'Não é possível gerar convite para um usuário de cargo igual ou maior que o seu',
    );
    if (alvo.senhaDefinidaEm) {
      throw new ConflictException('Este membro já definiu a senha');
    }

    const codigoConvite = gerarCodigoConvite();
    await this.prisma.user.update({
      where: { id },
      data: { codigoConvite },
    });
    return { codigoConvite };
  }

  async update(id: string, dto: UpdateUserDto, requestUser: AuthUser) {
    const alvo = await this.buscarComCargoOuFalhar(id);
    exigirNivelMenor(
      alvo.cargo.nivel,
      requestUser,
      'Não é possível editar um usuário com cargo de nível igual ou maior que o seu',
    );

    let novoCargoId: string | undefined;
    if (dto.cargoId) {
      const novoCargo = await this.buscarCargoOuFalhar(dto.cargoId);
      exigirNivelMenor(
        novoCargo.nivel,
        requestUser,
        'Não é possível definir um cargo de nível igual ou maior que o seu',
      );
      novoCargoId = novoCargo.id;
    }

    // Senha não entra aqui de propósito: quem gerencia altera dados cadastrais,
    // não define senha de outra pessoa. Troca de senha é ação do próprio dono
    // (via resgate de convite ou, futuramente, "alterar minha senha").
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        nome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
        ativo: dto.ativo,
        cargoId: novoCargoId,
      },
      include: { cargo: true },
    });

    return this.semSenha(user);
  }

  async remove(id: string, requestUser: AuthUser) {
    const alvo = await this.buscarComCargoOuFalhar(id);
    exigirNivelMenor(
      alvo.cargo.nivel,
      requestUser,
      'Não é possível excluir um usuário com cargo de nível igual ou maior que o seu',
    );

    return this.prisma.user.delete({ where: { id } });
  }
}
