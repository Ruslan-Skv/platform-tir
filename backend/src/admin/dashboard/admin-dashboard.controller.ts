import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../admin-access/admin-access.service';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('catalog-activity')
  @ApiOperation({
    summary:
      'Статистика: сколько товаров и категорий создал каждый админ за период и всего за всё время',
  })
  async getCatalogActivity(@Query('from') fromStr?: string, @Query('to') toStr?: string) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Некорректная дата');
    }
    if (from > to) {
      throw new BadRequestException('Дата «с» должна быть не позже даты «по»');
    }
    return this.adminDashboardService.getCatalogActivity(from, to);
  }
}
