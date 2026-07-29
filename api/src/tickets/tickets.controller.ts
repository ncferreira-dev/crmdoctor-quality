import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateStatusTicketDto } from './dto/update-status-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @RequirePermissao('TICKETS_READ')
  @Get()
  findAll(@Query() query: FindTicketsQueryDto) {
    return this.ticketsService.findAll(query);
  }

  @RequirePermissao('TICKETS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @RequirePermissao('TICKETS_WRITE')
  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @RequirePermissao('TICKETS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @RequirePermissao('TICKETS_WRITE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusTicketDto) {
    return this.ticketsService.updateStatus(id, dto);
  }

  @RequirePermissao('TICKETS_WRITE')
  @Patch(':id/responder')
  responder(@Param('id') id: string) {
    return this.ticketsService.responder(id);
  }

  @RequirePermissao('TICKETS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
