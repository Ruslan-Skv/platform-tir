import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OriginGuard } from '../common/guards/origin.guard';
import { FormsService } from './forms.service';
import { SubmitCallbackDto } from './dto/submit-callback.dto';
import { SubmitMeasurementDto } from './dto/submit-measurement.dto';

@ApiTags('forms')
@Controller('forms')
@UseGuards(OriginGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

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
}
