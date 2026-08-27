import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MarketingService } from './marketing.service';
import { CreateMarketingChannelDto } from './dto/create-marketing-channel.dto';
import { UpdateMarketingChannelDto } from './dto/update-marketing-channel.dto';
import { UpsertMarketingMetricDto } from './dto/upsert-marketing-metric.dto';
import { UpdateMarketingStrategyDto } from './dto/update-marketing-strategy.dto';
import { UpdateMarketingBudgetDto } from './dto/update-marketing-budget.dto';

@Controller('admin/marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER', 'MODERATOR')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('overview')
  getOverview(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.marketingService.getOverview(dateFrom, dateTo);
  }

  @Get('strategy')
  getStrategy() {
    return this.marketingService.getStrategy();
  }

  @Patch('strategy')
  updateStrategy(@Body() dto: UpdateMarketingStrategyDto) {
    return this.marketingService.updateStrategy(dto);
  }

  @Patch('budget')
  updateBudget(@Body() dto: UpdateMarketingBudgetDto) {
    return this.marketingService.updateBudget(dto);
  }

  @Get('channels')
  findAllChannels() {
    return this.marketingService.findAllChannels();
  }

  @Get('channels/:id')
  findOneChannel(@Param('id') id: string) {
    return this.marketingService.findOneChannel(id);
  }

  @Post('channels')
  createChannel(@Body() dto: CreateMarketingChannelDto) {
    return this.marketingService.createChannel(dto);
  }

  @Patch('channels/:id')
  updateChannel(@Param('id') id: string, @Body() dto: UpdateMarketingChannelDto) {
    return this.marketingService.updateChannel(id, dto);
  }

  @Delete('channels/:id')
  removeChannel(@Param('id') id: string) {
    return this.marketingService.removeChannel(id);
  }

  @Get('stats')
  getStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.marketingService.getChannelStats(dateFrom, dateTo);
  }

  @Get('metrics')
  listMetrics(
    @Query('channelId') channelId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketingService.listMetrics({
      channelId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Put('metrics')
  upsertMetric(@Body() dto: UpsertMarketingMetricDto) {
    return this.marketingService.upsertMetric(dto);
  }

  @Delete('metrics/:id')
  removeMetric(@Param('id') id: string) {
    return this.marketingService.removeMetric(id);
  }
}
