import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusTicket } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { paraBoolean } from '../../common/transforms/para-boolean';

export class FindTicketsQueryDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @Transform(paraBoolean)
  @IsBoolean()
  emAtraso?: boolean;

  // "Tudo que ainda não foi resolvido", que é a pergunta padrão de quem abre a
  // tela de Chamados. Não dá para responder com `status`, que é valor exato:
  // seriam três chamadas, uma por status aberto, e a lista voltaria a
  // discordar do card do dashboard no dia em que um status novo entrasse no
  // enum. Aqui a regra é a mesma `whereEmAberto` que o dashboard usa.
  @IsOptional()
  @Transform(paraBoolean)
  @IsBoolean()
  emAberto?: boolean;
}
