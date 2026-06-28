import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AdminLeadsService } from './admin-leads.service';
import { isLeadSource, isLeadStatus } from './lead.types';

type RequestWithUser = {
  user?: { role?: string };
};

@ApiTags('admin/leads')
@Controller('admin/leads')
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminLeadsController {
  constructor(private readonly adminLeads: AdminLeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Единая лента входящих заявок' })
  list(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const limitNum = Math.min(100, Math.max(1, limit ? parseInt(limit, 10) : 20));
    const allowedSources = this.adminLeads.resolveAllowedSources(req.user?.role ?? '');

    return this.adminLeads.listLeads({
      page: pageNum,
      limit: limitNum,
      source: source && isLeadSource(source) ? source : undefined,
      status: status && isLeadStatus(status) ? status : undefined,
      search,
      allowedSources,
    });
  }

  @Get(':leadId')
  @ApiOperation({ summary: 'Одна заявка из единой ленты' })
  getOne(@Req() req: RequestWithUser, @Param('leadId') leadId: string) {
    const allowedSources = this.adminLeads.resolveAllowedSources(req.user?.role ?? '');
    return this.adminLeads.getLead(decodeURIComponent(leadId), allowedSources);
  }

  @Patch(':leadId')
  @ApiOperation({ summary: 'Обновить статус или заметку менеджера' })
  update(@Req() req: RequestWithUser, @Param('leadId') leadId: string, @Body() dto: UpdateLeadDto) {
    const allowedSources = this.adminLeads.resolveAllowedSources(req.user?.role ?? '');
    return this.adminLeads.updateLead(decodeURIComponent(leadId), dto, allowedSources);
  }
}
