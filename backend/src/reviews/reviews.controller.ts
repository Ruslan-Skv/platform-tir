import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OriginGuard } from '../common/guards/origin.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки отзывов (публичный)' })
  getSettings() {
    return this.reviewsService.getReviewsBlock();
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Получить одобренные отзывы товара' })
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.min(Math.max(1, parseInt(page || '1', 10) || 1), 500);
    const limitNum = Math.min(Math.max(1, parseInt(limit || '10', 10) || 10), 50);
    return this.reviewsService.getProductReviews(productId, pageNum, limitNum);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('product/:productId')
  @UseGuards(OriginGuard, OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Создать отзыв на товар (опционально авторизован)' })
  createReview(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: RequestWithUser & { user?: RequestWithUser['user'] },
  ) {
    const userId = req.user?.id;
    return this.reviewsService.createReview(productId, dto, userId);
  }
}
