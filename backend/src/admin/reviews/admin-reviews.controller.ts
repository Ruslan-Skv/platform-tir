import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReviewsService } from '../../reviews/reviews.service';
import { UpdateReviewsBlockDto } from './dto/update-reviews-block.dto';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('admin/reviews')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Получить настройки отзывов' })
  getSettings() {
    return this.reviewsService.getReviewsBlock();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки отзывов' })
  async updateSettings(@Body() dto: UpdateReviewsBlockDto) {
    return this.prisma.reviewsBlock.upsert({
      where: { id: 'main' },
      update: dto,
      create: {
        id: 'main',
        enabled: dto.enabled ?? true,
        showOnCards: dto.showOnCards ?? true,
        requirePurchase: dto.requirePurchase ?? false,
        allowGuestReviews: dto.allowGuestReviews ?? true,
        requireModeration: dto.requireModeration ?? true,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Получить все отзывы (для модерации)' })
  async getAllReviews(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('productId') productId?: string,
    @Query('isApproved') isApprovedStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const skip = (page - 1) * limit;

    const where: { productId?: string; isApproved?: boolean } = productId ? { productId } : {};
    if (isApprovedStr === 'true') where.isApproved = true;
    if (isApprovedStr === 'false') where.isApproved = false;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: 'Ответить на отзыв' })
  async replyToReview(@Param('id') id: string, @Body() body: { adminReply: string }) {
    const reply = (body.adminReply ?? '').trim();
    return this.prisma.review.update({
      where: { id },
      data: {
        adminReply: reply || null,
        adminReplyAt: reply ? new Date() : null,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
    });
  }
}
