import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReviewsService } from '../../reviews/reviews.service';
import { UpdateReviewsBlockDto } from './dto/update-reviews-block.dto';
import { AdminReviewsService } from './admin-reviews.service';

@ApiTags('admin/reviews')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly adminReviews: AdminReviewsService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки отзывов' })
  getSettings() {
    return this.reviewsService.getReviewsBlock();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки отзывов' })
  updateSettings(@Body() dto: UpdateReviewsBlockDto) {
    return this.adminReviews.updateSettings(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все отзывы (для модерации)' })
  getAllReviews(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('productId') productId?: string,
    @Query('isApproved') isApprovedStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.adminReviews.getAllReviews(page, limit, productId, isApprovedStr);
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: 'Ответить на отзыв' })
  replyToReview(@Param('id') id: string, @Body() body: { adminReply: string }) {
    return this.adminReviews.replyToReview(id, body.adminReply ?? '');
  }
}
