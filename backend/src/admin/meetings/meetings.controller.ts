import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import { CreateMeetingDto, ListMeetingsDto, UpdateMeetingDto } from './dto/meetings.dto';
import { MeetingsService } from './meetings.service';

/**
 * Онлайн-собрания (mesh WebRTC-конференции сотрудников админки).
 * Управление собраниями — здесь, обмен WebRTC-сигналами — в meetings.gateway.
 */
@Controller('admin/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreateMeetingDto, @Request() req: RequestWithUser) {
    return this.meetingsService.create(req.user.id, dto);
  }

  @Get()
  @Roles(...ADMIN_ROLES)
  list(@Query() query: ListMeetingsDto, @Request() req: RequestWithUser) {
    return this.meetingsService.list(req.user.id, {
      scope: query.scope === 'past' ? 'past' : 'upcoming',
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('my')
  @Roles(...ADMIN_ROLES)
  listMine(@Request() req: RequestWithUser) {
    return this.meetingsService.listMine(req.user.id);
  }

  @Get('ice-servers')
  @Roles(...ADMIN_ROLES)
  getIceServers() {
    return { iceServers: this.meetingsService.getIceServers() };
  }

  @Get(':id')
  @Roles(...ADMIN_ROLES)
  getOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.meetingsService.getOne(req.user.id, id);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  update(@Param('id') id: string, @Body() dto: UpdateMeetingDto, @Request() req: RequestWithUser) {
    return this.meetingsService.update(req.user.id, id, dto);
  }

  @Post(':id/cancel')
  @Roles(...ADMIN_ROLES)
  cancel(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.meetingsService.cancel(req.user.id, id);
  }

  @Post(':id/join')
  @Roles(...ADMIN_ROLES)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  join(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.meetingsService.join(req.user.id, id);
  }

  @Post(':id/leave')
  @Roles(...ADMIN_ROLES)
  async leave(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.meetingsService.markLeft(req.user.id, id);
    return { ok: true };
  }
}
