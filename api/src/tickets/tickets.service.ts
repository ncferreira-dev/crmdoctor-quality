import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateStatusTicketDto } from './dto/update-status-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: FindTicketsQueryDto) {
    return this.prisma.ticket.findMany({
      where: { status: query.status, empresaId: query.empresaId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { empresa: true } });
    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }
    return ticket;
  }

  create(dto: CreateTicketDto) {
    return this.prisma.ticket.create({ data: dto });
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.findOne(id);
    return this.prisma.ticket.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ticket.delete({ where: { id } });
  }

  async updateStatus(id: string, dto: UpdateStatusTicketDto) {
    await this.findOne(id);
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: dto.status,
        resolvidoEm: dto.status === 'RESOLVIDO' ? new Date() : null,
      },
    });
  }
}
