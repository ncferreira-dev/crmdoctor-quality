import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { AuthUser } from '../common/types/auth-user';

@Injectable()
export class CargosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.cargo.findMany({ orderBy: { nivel: 'desc' } });
  }

  async findOne(id: string) {
    const cargo = await this.prisma.cargo.findUnique({ where: { id } });
    if (!cargo) {
      throw new NotFoundException('Cargo não encontrado');
    }
    return cargo;
  }

  create(dto: CreateCargoDto, requestUser: AuthUser) {
    if (dto.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível criar um cargo de nível igual ou maior que o seu');
    }
    return this.prisma.cargo.create({ data: dto });
  }

  async update(id: string, dto: UpdateCargoDto, requestUser: AuthUser) {
    const cargo = await this.findOne(id);

    if (cargo.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível editar um cargo de nível igual ou maior que o seu');
    }
    if (dto.nivel !== undefined && dto.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível definir um nível igual ou maior que o seu');
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
    if (cargo.nivel >= requestUser.cargoNivel) {
      throw new ForbiddenException('Não é possível excluir um cargo de nível igual ou maior que o seu');
    }
    if (cargo.usuarios.length > 0) {
      throw new ConflictException('Cargo possui usuários vinculados');
    }

    return this.prisma.cargo.delete({ where: { id } });
  }
}
