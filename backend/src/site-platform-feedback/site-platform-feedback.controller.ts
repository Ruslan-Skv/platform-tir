import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OriginGuard } from '../common/guards/origin.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';
import { CreateSitePlatformFeedbackDto } from './dto/create-site-platform-feedback.dto';
import { SitePlatformFeedbackService } from './site-platform-feedback.service';

@ApiTags('site-feedback')
@Controller('site-feedback')
@UseGuards(OriginGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class SitePlatformFeedbackController {
  constructor(private readonly sitePlatformFeedback: SitePlatformFeedbackService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Отправить обратную связь по публичному сайту' })
  createFeedback(@Body() dto: CreateSitePlatformFeedbackDto, @Request() req: RequestWithUser) {
    return this.sitePlatformFeedback.createFeedback(dto, req.user?.id);
  }
}
