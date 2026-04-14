import { Controller, Get, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';
import { ADMIN_ROLES } from '../admin-access/admin-access.service';
import { AdminPresenceService } from './admin-presence.service';

@ApiTags('admin-presence')
@Controller('admin/presence')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminPresenceController {
  constructor(private readonly adminPresenceService: AdminPresenceService) {}

  @Post('heartbeat')
  @HttpCode(204)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({
    summary: 'Отметить активность в админке (вызывать периодически с клиента)',
  })
  heartbeat(@Request() req: RequestWithUser): void {
    this.adminPresenceService.heartbeat(req.user.id);
  }

  @Get('online')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Список администраторов, сейчас работающих в админке' })
  getOnline() {
    return this.adminPresenceService.getOnlineAdmins();
  }
}
