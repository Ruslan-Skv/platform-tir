import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateHomeSectionsDto } from './dto/update-home-sections.dto';
import { HomeSectionsService } from './home-sections.service';

@ApiTags('home-sections')
@Controller('home/sections')
export class HomeSectionsController {
  constructor(private readonly homeSections: HomeSectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки видимости секций главной страницы (публичный)' })
  getVisibility() {
    return this.homeSections.getPublicVisibility();
  }
}

@ApiTags('admin/home-sections')
@Controller('admin/home/sections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminHomeSectionsController {
  constructor(private readonly homeSections: HomeSectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки видимости секций (админ)' })
  getVisibility() {
    return this.homeSections.getAdminVisibility();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить видимость секций главной страницы' })
  updateVisibility(@Body() dto: UpdateHomeSectionsDto) {
    return this.homeSections.updateVisibility(dto);
  }
}
