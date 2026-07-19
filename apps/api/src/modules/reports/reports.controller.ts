import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ReportsService } from './reports.service';

// Cross-module reporting (MASTER.md §6 module #13) — aggregate financial figures are a
// manager-level concern, not a day-to-day operational view, so reads are restricted to
// agency_admin/branch_manager (unlike Booking's own unrestricted-read endpoints).
@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.agency_admin, UserRole.branch_manager)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async sales(
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('branchId') branchId?: string,
  ) {
    const report = await this.reportsService.getSales({ createdAfter, createdBefore, branchId });
    return { data: report, meta: {} };
  }

  @Get('outstanding')
  async outstanding(
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('branchId') branchId?: string,
  ) {
    const report = await this.reportsService.getOutstanding({ createdAfter, createdBefore, branchId });
    return { data: report, meta: {} };
  }

  @Get('agent-performance')
  async agentPerformance(
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('branchId') branchId?: string,
  ) {
    const report = await this.reportsService.getAgentPerformance({ createdAfter, createdBefore, branchId });
    return { data: report, meta: {} };
  }
}
