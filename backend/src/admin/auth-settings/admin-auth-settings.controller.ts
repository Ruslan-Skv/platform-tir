import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthSettingsService } from '../../auth/auth-settings.service';
import { AdminAuthSettingsService } from './admin-auth-settings.service';
import { UpdateAuthSettingsDto } from './dto/update-auth-settings.dto';

@ApiTags('admin/auth-settings')
@Controller('admin/auth-settings')
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminAuthSettingsController {
  constructor(
    private readonly authSettings: AuthSettingsService,
    private readonly adminAuthSettings: AdminAuthSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки авторизации' })
  getSettings() {
    return this.authSettings.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить настройки авторизации' })
  updateSettings(@Body() dto: UpdateAuthSettingsDto) {
    return this.adminAuthSettings.updateSettings(dto);
  }
}
