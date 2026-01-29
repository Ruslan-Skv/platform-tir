import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR', 'SUPPORT')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('sales/overview')
  getSalesOverview(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.analyticsService.getSalesOverview(dateFrom, dateTo);
  }

  @Get('sales/by-period')
  getSalesByPeriod(
    @Query('period') period?: 'day' | 'week' | 'month',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getSalesByPeriod(period, dateFrom, dateTo);
  }

  @Get('products/top')
  getTopProducts(
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getTopProducts(limit ? parseInt(limit, 10) : 10, dateFrom, dateTo);
  }

  @Get('categories/top')
  getTopCategories(
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getTopCategories(
      limit ? parseInt(limit, 10) : 10,
      dateFrom,
      dateTo,
    );
  }

  @Get('customers')
  getCustomerStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.analyticsService.getCustomerStats(dateFrom, dateTo);
  }

  @Get('managers/kpi')
  getManagerKPIs(
    @Query('managerId') managerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getManagerKPIs(managerId, dateFrom, dateTo);
  }

  @Get('marketing')
  @Roles('ADMIN')
  getMarketingStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.analyticsService.getMarketingStats(dateFrom, dateTo);
  }

  @Get('financial')
  @Roles('ADMIN')
  getFinancialReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.analyticsService.getFinancialReport(dateFrom, dateTo);
  }
}
