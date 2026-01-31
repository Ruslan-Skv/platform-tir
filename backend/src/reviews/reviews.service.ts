import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /** Получить настройки отзывов */
  async getReviewsBlock() {
    const block = await this.prisma.reviewsBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return {
        id: 'main',
        enabled: true,
        showOnCards: true,
        requirePurchase: false,
        allowGuestReviews: true,
        requireModeration: true,
      };
    }
    return block;
  }

  /** Получить одобренные отзывы товара (публичный API) */
  async getProductReviews(productId: string, page = 1, limit = 10) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    const skip = (page - 1) * limit;
    const [reviews, total, agg] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { productId, isApproved: true } }),
      this.prisma.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    const averageRating = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0;

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating,
    };
  }

  /** Создать отзыв (публичный API) */
  async createReview(productId: string, dto: CreateReviewDto, userId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    const block = await this.getReviewsBlock();
    if (!block.enabled) {
      throw new BadRequestException('Отзывы временно отключены');
    }

    let userName: string;
    let userEmail: string | undefined;

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (!user) {
        throw new BadRequestException('Пользователь не найден');
      }
      userName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0];
      userEmail = user.email;
    } else {
      if (!block.allowGuestReviews) {
        throw new ForbiddenException('Только авторизованные пользователи могут оставлять отзывы');
      }
      userName = dto.userName?.trim() || 'Гость';
      userEmail = dto.userEmail?.trim();
      if (!userName || userName === 'Гость') {
        throw new BadRequestException('Укажите имя для отзыва');
      }
    }

    if (block.requirePurchase && userId) {
      const hasPurchased = await this.userHasPurchasedProduct(userId, productId);
      if (!hasPurchased) {
        throw new ForbiddenException('Оставлять отзывы могут только покупатели этого товара');
      }
    }

    const isApproved = !block.requireModeration;

    return this.prisma.review.create({
      data: {
        productId,
        userId: userId ?? null,
        userName,
        userEmail: userEmail ?? null,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        isApproved,
      },
    });
  }

  /** Проверить, покупал ли пользователь товар (доставленные заказы) */
  private async userHasPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: { in: ['DELIVERED', 'SHIPPED'] },
        },
      },
    });
    return !!orderItem;
  }
}
