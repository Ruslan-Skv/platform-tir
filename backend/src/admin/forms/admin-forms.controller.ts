import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateCallbackFormBlockDto } from './dto/update-callback-form-block.dto';
import { UpdateDirectorMessageBlockDto } from './dto/update-director-message-block.dto';
import { UpdateMeasurementFormBlockDto } from './dto/update-measurement-form-block.dto';
import { UpdateQuoteFormBlockDto } from './dto/update-quote-form-block.dto';
import { AdminFormsService } from './admin-forms.service';

@ApiTags('admin/forms')
@Controller('admin/forms')
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminFormsController {
  constructor(private readonly adminForms: AdminFormsService) {}

  @Get()
  @ApiOperation({ summary: 'Список заявок с форм (замер, обратный звонок, письмо директору)' })
  findAll(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminForms.findSubmissions(type, pageNum, limitNum);
  }

  @Get('director-settings')
  @ApiOperation({ summary: 'Настройки формы «Письмо директору»' })
  getDirectorSettings() {
    return this.adminForms.getDirectorSettings();
  }

  @Patch('director-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Письмо директору»' })
  updateDirectorSettings(@Body() dto: UpdateDirectorMessageBlockDto) {
    return this.adminForms.updateDirectorSettings(dto);
  }

  @Get('measurement-form-settings')
  @ApiOperation({ summary: 'Настройки формы «Записаться на замер»' })
  getMeasurementFormSettings() {
    return this.adminForms.getMeasurementFormSettings();
  }

  @Patch('measurement-form-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Записаться на замер»' })
  updateMeasurementFormSettings(@Body() dto: UpdateMeasurementFormBlockDto) {
    return this.adminForms.updateMeasurementFormSettings(dto);
  }

  @Get('callback-form-settings')
  @ApiOperation({ summary: 'Настройки формы «Заказать звонок»' })
  getCallbackFormSettings() {
    return this.adminForms.getCallbackFormSettings();
  }

  @Patch('callback-form-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Заказать звонок»' })
  updateCallbackFormSettings(@Body() dto: UpdateCallbackFormBlockDto) {
    return this.adminForms.updateCallbackFormSettings(dto);
  }

  @Get('quote-form-settings')
  @ApiOperation({ summary: 'Настройки формы «Рассчитать стоимость»' })
  getQuoteFormSettings() {
    return this.adminForms.getQuoteFormSettings();
  }

  @Patch('quote-form-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Рассчитать стоимость»' })
  updateQuoteFormSettings(@Body() dto: UpdateQuoteFormBlockDto) {
    return this.adminForms.updateQuoteFormSettings(dto);
  }
}
