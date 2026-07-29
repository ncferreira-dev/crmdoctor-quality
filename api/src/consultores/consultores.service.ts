import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultorDto } from './dto/create-consultor.dto';
import { UpdateConsultorDto } from './dto/update-consultor.dto';
import { FindConsultoresQueryDto } from './dto/find-consultores-query.dto';

@Injectable()
export class ConsultoresService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindConsultoresQueryDto) {
    // Até o ValidationPipe global (Prompt 9) transformar query params, ?ativo=
    // chega como string; normalizamos aqui pra não depender da ordem dos prompts.
    const ativo =
      query.ativo === undefined ? undefined : (query.ativo as unknown as string) !== 'false' && !!query.ativo;

    return this.prisma.consultor.findMany({
      where: { ativo },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const consultor = await this.prisma.consultor.findUnique({ where: { id } });
    if (!consultor) {
      throw new NotFoundException('Consultor não encontrado');
    }
    return consultor;
  }

  create(dto: CreateConsultorDto) {
    return this.prisma.consultor.create({ data: dto });
  }

  async update(id: string, dto: UpdateConsultorDto) {
    await this.findOne(id);
    return this.prisma.consultor.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.consultor.delete({ where: { id } });
  }
}
