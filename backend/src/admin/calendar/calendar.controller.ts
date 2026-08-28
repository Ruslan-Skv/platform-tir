import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithUser } from '../../common/types/request-with-user.types';
import { CreateCalendarCustomEventDto } from './dto/calendar.dto';
import { CalendarService } from './calendar.service';

@Controller('admin/calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGER',
  'MODERATOR',
  'CONTENT_MANAGER',
  'SUPPORT',
  'TECHNOLOGIST',
  'TRAINEE',
)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  listEvents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
  ) {
    return this.calendarService.listEvents({ from, to, types });
  }

  @Post('events')
  createEvent(@Body() dto: CreateCalendarCustomEventDto, @Request() req: RequestWithUser) {
    return this.calendarService.createCustomEvent(req.user.id, dto);
  }
}
