import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateMissionPageDto } from './dto/update-mission-page.dto';
import { MissionService } from './mission.service';

@ApiTags('mission')
@Controller('mission')
export class MissionPublicController {
  constructor(private readonly mission: MissionService) {}

  @Get()
  @ApiOperation({ summary: 'Страница миссии компании (публичный)' })
  getPublic() {
    return this.mission.getPublic();
  }
}

@ApiTags('admin/mission')
@Controller('admin/content/mission')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class MissionAdminController {
  constructor(private readonly mission: MissionService) {}

  @Get('page')
  @ApiOperation({ summary: 'Настройки страницы миссии' })
  getPage() {
    return this.mission.getAdmin();
  }

  @Patch('page')
  @ApiOperation({ summary: 'Обновить страницу миссии' })
  updatePage(@Body() dto: UpdateMissionPageDto) {
    return this.mission.updateAdmin(dto);
  }
}
