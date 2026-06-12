import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateReviewsBlockDto } from './dto/update-reviews-block.dto';

@Injectable()
export class AdminReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  updateSettings(dto: UpdateReviewsBlockDto) {
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

  async getAllReviews(page: number, limit: number, productId?: string, isApprovedStr?: string) {
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

  replyToReview(id: string, adminReply: string) {
    const reply = adminReply.trim();
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
