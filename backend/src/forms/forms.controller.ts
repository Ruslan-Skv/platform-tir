import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OriginGuard } from '../common/guards/origin.guard';
import { FormsService } from './forms.service';
import { SubmitCallbackDto } from './dto/submit-callback.dto';
import { SubmitDirectorMessageDto } from './dto/submit-director-message.dto';
import { SubmitMeasurementDto } from './dto/submit-measurement.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';

@ApiTags('forms')
@Controller('forms')
@UseGuards(OriginGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get('quote-form-options')
  @ApiOperation({
    summary: 'Список видов работ/товаров для формы «Рассчитать стоимость» (публичный)',
  })
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getQuoteFormOptions() {
    return this.formsService.getQuoteFormOptions();
  }

  @Post('measurement')
  @ApiOperation({ summary: 'Запись на бесплатный замер' })
  async submitMeasurement(@Body() dto: SubmitMeasurementDto) {
    return this.formsService.submitMeasurement(dto);
  }

  @Post('callback')
  @ApiOperation({ summary: 'Заказ обратного звонка' })
  async submitCallback(@Body() dto: SubmitCallbackDto) {
    return this.formsService.submitCallback(dto);
  }

  @Post('director-message')
  @ApiOperation({ summary: 'Письмо директору' })
  async submitDirectorMessage(@Body() dto: SubmitDirectorMessageDto) {
    return this.formsService.submitDirectorMessage(dto);
  }

  @Post('quote')
  @ApiOperation({ summary: 'Заявка на расчёт стоимости / Отправить заявку' })
  async submitQuote(@Body() dto: SubmitQuoteDto) {
    return this.formsService.submitQuote(dto);
  }
}
