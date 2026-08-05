import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  // O usuário chega até o service porque os dois números de dinheiro do resumo
  // (valor em andamento e valor por empresa) só saem para quem tem
  // FINANCEIRO_READ.
  @RequirePermissao('DASHBOARD_READ')
  @Get('resumo')
  resumo(@CurrentUser() user: AuthUser) {
    return this.dashboardService.resumo(user);
  }
}
