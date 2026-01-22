import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список избранных товаров' })
  getWishlist(@Request() req: RequestWithUser) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Получить количество товаров в избранном' })
  getWishlistCount(@Request() req: RequestWithUser) {
    return this.wishlistService.getWishlistCount(req.user.id);
  }

  @Get('items')
  @ApiOperation({ summary: 'Получить список элементов избранного с метаданными' })
  getWishlistItems(@Request() req: RequestWithUser) {
    return this.wishlistService.getWishlistItems(req.user.id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Добавить товар в избранное' })
  addToWishlist(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(req.user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Удалить товар из избранного' })
  removeFromWishlist(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(req.user.id, productId);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Проверить, находится ли товар в избранном' })
  async checkInWishlist(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    const isInWishlist = await this.wishlistService.isInWishlist(req.user.id, productId);
    return { isInWishlist };
  }
}
