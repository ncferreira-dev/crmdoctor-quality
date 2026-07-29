import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser } from '../common/types/auth-user';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private semSenha<T extends { senhaHash: string }>(user: T) {
    const { senhaHash: _senhaHash, ...resto } = user;
    return resto;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { cargo: true },
      orderBy: { nome: 'asc' },
    });
    return users.map((u) => this.semSenha(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.semSenha(user);
  }

  async create(dto: CreateUserDto, requestUser: AuthUser) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id: dto.cargoId } });
    if (!cargo) {
      throw new NotFoundException('Cargo não encontrado');
    }
    if (cargo.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível criar um usuário com cargo de nível igual ou maior que o seu');
    }

    const emailEmUso = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailEmUso) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await argon2.hash(dto.senha);
    const user = await this.prisma.user.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        cargoId: dto.cargoId,
        ativo: dto.ativo ?? true,
      },
      include: { cargo: true },
    });

    return this.semSenha(user);
  }

  async update(id: string, dto: UpdateUserDto, requestUser: AuthUser) {
    const alvo = await this.prisma.user.findUnique({ where: { id }, include: { cargo: true } });
    if (!alvo) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (alvo.cargo.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível editar um usuário com cargo de nível igual ou maior que o seu');
    }

    let novoCargoId: string | undefined;
    if (dto.cargoId) {
      const novoCargo = await this.prisma.cargo.findUnique({ where: { id: dto.cargoId } });
      if (!novoCargo) {
        throw new NotFoundException('Cargo não encontrado');
      }
      if (novoCargo.nivel >= requestUser.cargoNivel) {
        throw new ForbiddenException('Não é possível definir um cargo de nível igual ou maior que o seu');
      }
      novoCargoId = novoCargo.id;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        nome: dto.nome,
        email: dto.email,
        ativo: dto.ativo,
        cargoId: novoCargoId,
        senhaHash: dto.senha ? await argon2.hash(dto.senha) : undefined,
      },
      include: { cargo: true },
    });

    return this.semSenha(user);
  }

  async remove(id: string, requestUser: AuthUser) {
    const alvo = await this.prisma.user.findUnique({ where: { id }, include: { cargo: true } });
    if (!alvo) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (alvo.cargo.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível excluir um usuário com cargo de nível igual ou maior que o seu');
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
