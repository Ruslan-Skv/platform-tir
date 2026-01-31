import { Body, Controller, Get, Param, Patch, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserCabinetDto } from './dto/update-user-cabinet.dto';

@ApiTags('admin/user-cabinet')
@Controller('admin/user-cabinet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class UserCabinetController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки личного кабинета (супер-админ)' })
  async getSettings() {
    const block = await this.prisma.userCabinetBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return this.prisma.userCabinetBlock.create({
        data: {
          id: 'main',
          showProfileSection: true,
          showOrdersSection: true,
          showNotificationsSection: true,
          showNotificationHistory: true,
          showPasswordSection: true,
          showQuickLinks: true,
        },
      });
    }
    return block;
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Данные личного кабинета пользователя (супер-админ)' })
  async getUserCabinet(@Param('userId') userId: string) {
    const [user, orders, notifSettings, notifications] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: { include: { product: { select: { id: true, name: true, slug: true } } } },
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.userNotificationSettings.findUnique({
        where: { userId },
      }),
      this.prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return {
      user,
      orders,
      notificationSettings: notifSettings ?? { notifyOnSupportChatReply: true },
      notifications,
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки личного кабинета (супер-админ)' })
  async updateSettings(@Body() dto: UpdateUserCabinetDto) {
    return this.prisma.userCabinetBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.showProfileSection !== undefined && { showProfileSection: dto.showProfileSection }),
        ...(dto.showOrdersSection !== undefined && { showOrdersSection: dto.showOrdersSection }),
        ...(dto.showNotificationsSection !== undefined && {
          showNotificationsSection: dto.showNotificationsSection,
        }),
        ...(dto.showNotificationHistory !== undefined && {
          showNotificationHistory: dto.showNotificationHistory,
        }),
        ...(dto.showPasswordSection !== undefined && {
          showPasswordSection: dto.showPasswordSection,
        }),
        ...(dto.showQuickLinks !== undefined && { showQuickLinks: dto.showQuickLinks }),
      },
      create: {
        id: 'main',
        showProfileSection: dto.showProfileSection ?? true,
        showOrdersSection: dto.showOrdersSection ?? true,
        showNotificationsSection: dto.showNotificationsSection ?? true,
        showNotificationHistory: dto.showNotificationHistory ?? true,
        showPasswordSection: dto.showPasswordSection ?? true,
        showQuickLinks: dto.showQuickLinks ?? true,
      },
    });
  }
}
