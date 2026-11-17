import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RemoteHelpSessionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import {
  CreateRemoteHelpInviteDto,
  EndRemoteHelpSessionDto,
  ListRemoteHelpSessionsDto,
} from './dto/remote-help.dto';
import { RemoteHelpService } from './remote-help.service';

/**
 * Удалённая помощь: суперадмин подключается к экрану сотрудника (WebRTC).
 * Управление сессиями — здесь, обмен WebRTC-сигналами — в remote-help.gateway.
 */
@Controller('admin/remote-help')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemoteHelpController {
  constructor(private readonly remoteHelpService: RemoteHelpService) {}

  // — Панель суперадмина —

  @Post('invites')
  @Roles('SUPER_ADMIN')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createInvite(@Body() dto: CreateRemoteHelpInviteDto, @Request() req: RequestWithUser) {
    return this.remoteHelpService.createInvite(req.user.id, dto);
  }

  @Get('pending')
  @Roles('SUPER_ADMIN')
  listPending() {
    return this.remoteHelpService.listOpenSessions();
  }

  @Get('sessions')
  @Roles('SUPER_ADMIN')
  listSessions(@Query() query: ListRemoteHelpSessionsDto) {
    return this.remoteHelpService.listSessions({
      status: query.status as RemoteHelpSessionStatus | undefined,
      userId: query.userId,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('sessions/:id/claim')
  @Roles('SUPER_ADMIN')
  claim(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.remoteHelpService.claim(req.user.id, id);
  }

  @Post('sessions/:id/cancel')
  @Roles('SUPER_ADMIN')
  cancel(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.remoteHelpService.cancel(req.user.id, id);
  }

  // — Действия сотрудника —

  @Get('my-session')
  @Roles(...ADMIN_ROLES)
  getMyOpenSession(@Request() req: RequestWithUser) {
    return this.remoteHelpService.getMyOpenSession(req.user.id);
  }

  @Post('requests')
  @Roles(...ADMIN_ROLES)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createRequest(@Request() req: RequestWithUser) {
    return this.remoteHelpService.createRequest(req.user.id);
  }

  @Post('sessions/:id/accept')
  @Roles(...ADMIN_ROLES)
  accept(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.remoteHelpService.accept(req.user.id, id);
  }

  @Post('sessions/:id/decline')
  @Roles(...ADMIN_ROLES)
  decline(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.remoteHelpService.decline(req.user.id, id);
  }

  @Post('sessions/:id/end')
  @Roles(...ADMIN_ROLES)
  end(
    @Param('id') id: string,
    @Body() dto: EndRemoteHelpSessionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.remoteHelpService.end(req.user.id, id, dto.reason ?? 'manual');
  }

  // — Общее —

  @Get('ice-servers')
  @Roles(...ADMIN_ROLES)
  getIceServers() {
    return { iceServers: this.remoteHelpService.getIceServers() };
  }
}
