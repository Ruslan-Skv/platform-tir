import { Module } from '@nestjs/common';
import { AdminAuthSettingsController } from './admin-auth-settings.controller';
import { AdminAuthSettingsService } from './admin-auth-settings.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthSettingsController],
  providers: [AdminAuthSettingsService],
})
export class AdminAuthSettingsModule {}
