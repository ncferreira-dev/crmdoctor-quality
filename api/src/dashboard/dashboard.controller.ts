import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @RequirePermissao('DASHBOARD_READ')
  @Get('resumo')
  resumo() {
    return this.dashboardService.resumo();
  }
}
