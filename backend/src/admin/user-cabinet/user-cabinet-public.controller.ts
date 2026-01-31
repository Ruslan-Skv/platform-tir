import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('user-cabinet')
@Controller('user-cabinet')
export class UserCabinetPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Настройки личного кабинета (публичный)' })
  async getSettings() {
    const block = await this.prisma.userCabinetBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return {
        showProfileSection: true,
        showOrdersSection: true,
        showNotificationsSection: true,
        showNotificationHistory: true,
        showPasswordSection: true,
        showQuickLinks: true,
      };
    }
    return block;
  }
}
