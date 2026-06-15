import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OriginGuard } from '../common/guards/origin.guard';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@Controller('quiz/public')
@UseGuards(OriginGuard)
export class QuizPublicController {
  constructor(private readonly quizService: QuizService) {}

  @Get('config')
  @ApiOperation({ summary: 'Публичная конфигурация квиза (по домену или slug)' })
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getConfig(@Query('host') host?: string, @Query('slug') slug?: string) {
    return this.quizService.getPublicConfig({ host, slug });
  }

  @Post(':slug/submit')
  @ApiOperation({ summary: 'Отправить заявку с квиза' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Param('slug') slug: string, @Body() dto: SubmitQuizDto) {
    return this.quizService.submit(slug, dto);
  }
}
