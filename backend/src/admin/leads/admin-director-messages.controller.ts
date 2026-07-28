import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AdminLeadsService } from './admin-leads.service';
import { isLeadStatus } from './lead.types';

@ApiTags('admin/director-messages')
@Controller('admin/director-messages')
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminDirectorMessagesController {
  constructor(private readonly adminLeads: AdminLeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Лента писем директору' })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const limitNum = Math.min(100, Math.max(1, limit ? parseInt(limit, 10) : 20));
    const allowedSources = this.adminLeads.resolveDirectorSources();

    return this.adminLeads.listLeads({
      page: pageNum,
      limit: limitNum,
      source: 'form_director',
      status: status && isLeadStatus(status) ? status : undefined,
      search,
      allowedSources,
    });
  }

  @Get(':leadId')
  @ApiOperation({ summary: 'Одно письмо директору' })
  getOne(@Param('leadId') leadId: string) {
    const allowedSources = this.adminLeads.resolveDirectorSources();
    return this.adminLeads.getLead(decodeURIComponent(leadId), allowedSources);
  }

  @Patch(':leadId')
  @ApiOperation({ summary: 'Обновить статус или заметку письма директору' })
  update(@Param('leadId') leadId: string, @Body() dto: UpdateLeadDto) {
    const allowedSources = this.adminLeads.resolveDirectorSources();
    return this.adminLeads.updateLead(decodeURIComponent(leadId), dto, allowedSources);
  }
}
