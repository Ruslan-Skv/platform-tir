import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

class UpdateCartItemDto {
  quantity: number;
}

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Получить содержимое корзины' })
  getCart(@Request() req: RequestWithUser) {
    return this.cartService.getCart(req.user.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Получить количество товаров в корзине' })
  getCartCount(@Request() req: RequestWithUser) {
    return this.cartService.getCartCount(req.user.id);
  }

  @Get('items')
  @ApiOperation({ summary: 'Получить список элементов корзины с метаданными' })
  getCartItems(@Request() req: RequestWithUser) {
    return this.cartService.getCartItems(req.user.id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Добавить товар в корзину' })
  addToCart(
    @Request() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body() body?: { quantity?: number },
  ) {
    const quantity = body?.quantity || 1;
    return this.cartService.addToCart(req.user.id, productId, quantity);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Обновить количество товара в корзине' })
  updateCartItem(
    @Request() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItemQuantity(req.user.id, productId, body.quantity);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Удалить товар из корзины' })
  removeFromCart(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    return this.cartService.removeFromCart(req.user.id, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Очистить корзину' })
  clearCart(@Request() req: RequestWithUser) {
    return this.cartService.clearCart(req.user.id);
  }
}
