import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateAuthSettingsDto } from './dto/update-auth-settings.dto';

@Injectable()
export class AdminAuthSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  updateSettings(dto: UpdateAuthSettingsDto) {
    return this.prisma.authSettings.upsert({
      where: { id: 'main' },
      update: dto,
      create: {
        id: 'main',
        sberAuthEnabled: dto.sberAuthEnabled ?? true,
      },
    });
  }
}
