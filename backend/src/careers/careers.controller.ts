import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CareersService } from './careers.service';
import { CreateCareerVacancyDto, UpdateCareersPageDto } from './dto/careers.dto';
import { UpdateCareerVacancyDto } from './dto/update-career-vacancy.dto';

@ApiTags('careers')
@Controller('careers')
export class CareersPublicController {
  constructor(private readonly careers: CareersService) {}

  @Get()
  @ApiOperation({ summary: 'Страница вакансий (публичный)' })
  getPublic() {
    return this.careers.getPublic();
  }
}

@ApiTags('admin/careers')
@Controller('admin/content/careers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CareersAdminController {
  constructor(private readonly careers: CareersService) {}

  @Get('page')
  @ApiOperation({ summary: 'Настройки страницы вакансий' })
  getPage() {
    return this.careers.getAdminPage();
  }

  @Patch('page')
  @ApiOperation({ summary: 'Обновить настройки страницы' })
  updatePage(@Body() dto: UpdateCareersPageDto) {
    return this.careers.updateAdminPage(dto);
  }

  @Get('vacancies')
  @ApiOperation({ summary: 'Список вакансий (админ)' })
  listVacancies() {
    return this.careers.listAdminVacancies();
  }

  @Post('vacancies')
  @ApiOperation({ summary: 'Создать вакансию' })
  createVacancy(@Body() dto: CreateCareerVacancyDto) {
    return this.careers.createVacancy(dto);
  }

  @Get('vacancies/:id')
  @ApiOperation({ summary: 'Вакансия по ID' })
  getVacancy(@Param('id') id: string) {
    return this.careers.getAdminVacancy(id);
  }

  @Patch('vacancies/:id')
  @ApiOperation({ summary: 'Обновить вакансию' })
  updateVacancy(@Param('id') id: string, @Body() dto: UpdateCareerVacancyDto) {
    return this.careers.updateVacancy(id, dto);
  }

  @Delete('vacancies/:id')
  @ApiOperation({ summary: 'Удалить вакансию' })
  async removeVacancy(@Param('id') id: string) {
    await this.careers.removeVacancy(id);
    return { ok: true };
  }
}
