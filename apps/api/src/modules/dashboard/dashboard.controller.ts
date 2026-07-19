import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { DashboardService } from './dashboard.service';

// Same role restriction as Reports (agency_admin/branch_manager) — the KPI cards here
// expose the identical revenue/outstanding figures, so a plain agent blocked from
// /reports must not be able to see the same numbers via a differently-named endpoint.
@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.agency_admin, UserRole.branch_manager)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async summary() {
    const summary = await this.dashboardService.getSummary();
    return { data: summary, meta: {} };
  }
}
