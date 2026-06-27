import { Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KnowledgePlatformFeedbackType } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SitePlatformFeedbackService } from './site-platform-feedback.service';

@ApiTags('admin/site-feedback')
@Controller('admin/site-feedback')
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class SitePlatformFeedbackAdminController {
  constructor(private readonly sitePlatformFeedback: SitePlatformFeedbackService) {}

  @Get()
  @ApiOperation({ summary: 'Список обратной связи по публичному сайту' })
  listFeedback(
    @Query('type') type?: KnowledgePlatformFeedbackType,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.sitePlatformFeedback.listFeedback({
      type,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Patch('mark-read')
  @ApiOperation({ summary: 'Отметить все сообщения прочитанными' })
  markFeedbackRead() {
    return this.sitePlatformFeedback.markAllAsRead();
  }
}
