import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WeatherstripsService } from './weatherstrips.service';
import { CreateWeatherstripDto } from './dto/create-weatherstrip.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/weatherstrips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'PARTNER')
export class WeatherstripsController {
  constructor(private readonly weatherstripsService: WeatherstripsService) {}

  @Post()
  create(@Body() dto: CreateWeatherstripDto) {
    return this.weatherstripsService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.weatherstripsService.findAll({
      search,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.weatherstripsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateWeatherstripDto>) {
    return this.weatherstripsService.update(id, data);
  }

  @Post('reorder')
  reorder(@Body() items: { id: string; order: number }[]) {
    return this.weatherstripsService.reorder(items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.weatherstripsService.remove(id);
  }
}
