import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserCabinetDto } from './dto/update-user-cabinet.dto';
import { UserCabinetService } from './user-cabinet.service';

@ApiTags('admin/user-cabinet')
@Controller('admin/user-cabinet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class UserCabinetController {
  constructor(private readonly userCabinet: UserCabinetService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки личного кабинета (супер-админ)' })
  getSettings() {
    return this.userCabinet.getAdminSettings();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Данные личного кабинета пользователя (супер-админ)' })
  getUserCabinet(@Param('userId') userId: string) {
    return this.userCabinet.getUserCabinet(userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки личного кабинета (супер-админ)' })
  updateSettings(@Body() dto: UpdateUserCabinetDto) {
    return this.userCabinet.updateSettings(dto);
  }
}
