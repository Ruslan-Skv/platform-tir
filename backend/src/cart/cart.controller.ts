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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

class ServiceCartItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity: number;
}

class ServiceCartRoomDto {
  @ApiProperty({ description: 'Название помещения' })
  @IsString()
  name: string;

  @ApiProperty({ type: [ServiceCartItemDto], description: 'Позиции услуг помещения' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCartItemDto)
  items: { itemId: string; quantity: number }[];
}

class AddServiceToCartDto {
  @ApiProperty({ description: 'ID категории каталога услуг' })
  @IsString()
  categoryId: string;

  @ApiProperty({ type: [ServiceCartItemDto], description: 'Позиции услуг (устаревший формат)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCartItemDto)
  items?: { itemId: string; quantity: number }[];

  @ApiProperty({ type: [ServiceCartRoomDto], description: 'Расчёты по помещениям' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCartRoomDto)
  rooms?: { name: string; items: { itemId: string; quantity: number }[] }[];
}

class UpdateCartItemDto {
  @ApiProperty({ example: 1, description: 'Количество товара' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
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

  @Get('service-items')
  @ApiOperation({ summary: 'Получить услуги в корзине' })
  getCartServiceItems(@Request() req: RequestWithUser) {
    return this.cartService.getCartServiceItems(req.user.id);
  }

  @Post('service')
  @ApiOperation({ summary: 'Добавить выбранные услуги категории в корзину' })
  addServiceToCart(@Request() req: RequestWithUser, @Body() body: AddServiceToCartDto) {
    return this.cartService.addServiceSelectionToCart(
      req.user.id,
      body.categoryId,
      body.items ?? [],
      body.rooms,
    );
  }

  @Delete('service/:itemId')
  @ApiOperation({ summary: 'Удалить услуги категории из корзины' })
  removeCartServiceItem(@Request() req: RequestWithUser, @Param('itemId') itemId: string) {
    return this.cartService.removeCartServiceItemById(req.user.id, itemId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Добавить товар в корзину' })
  addToCart(
    @Request() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body()
    body?: { quantity?: number; size?: string; openingSide?: string; cardVariantId?: string },
  ) {
    const quantity = body?.quantity || 1;
    return this.cartService.addToCart(
      req.user.id,
      productId,
      quantity,
      body?.size,
      body?.openingSide,
      body?.cardVariantId,
    );
  }

  @Post('component/:componentId')
  @ApiOperation({ summary: 'Добавить комплектующее в корзину' })
  addComponentToCart(
    @Request() req: RequestWithUser,
    @Param('componentId') componentId: string,
    @Body() body?: { quantity?: number },
  ) {
    const quantity = body?.quantity || 1;
    return this.cartService.addComponentToCart(req.user.id, componentId, quantity);
  }

  @Put('item/:itemId')
  @ApiOperation({ summary: 'Обновить количество элемента корзины по ID' })
  updateCartItemById(
    @Request() req: RequestWithUser,
    @Param('itemId') itemId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItemQuantityById(req.user.id, itemId, body.quantity);
  }

  @Put(':productId')
  @ApiOperation({
    summary: 'Обновить количество товара в корзине (устаревший метод, используйте /item/:itemId)',
  })
  updateCartItem(
    @Request() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItemQuantity(req.user.id, productId, body.quantity);
  }

  @Put('component/:componentId')
  @ApiOperation({ summary: 'Обновить количество комплектующего в корзине' })
  updateComponentQuantity(
    @Request() req: RequestWithUser,
    @Param('componentId') componentId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateComponentQuantity(req.user.id, componentId, body.quantity);
  }

  @Delete('item/:itemId')
  @ApiOperation({ summary: 'Удалить элемент корзины по ID' })
  removeCartItem(@Request() req: RequestWithUser, @Param('itemId') itemId: string) {
    return this.cartService.removeCartItemById(req.user.id, itemId);
  }

  @Delete(':productId')
  @ApiOperation({
    summary: 'Удалить товар из корзины (устаревший метод, используйте /item/:itemId)',
  })
  removeFromCart(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    return this.cartService.removeFromCart(req.user.id, productId);
  }

  @Delete('component/:componentId')
  @ApiOperation({ summary: 'Удалить комплектующее из корзины' })
  removeComponentFromCart(
    @Request() req: RequestWithUser,
    @Param('componentId') componentId: string,
  ) {
    return this.cartService.removeComponentFromCart(req.user.id, componentId);
  }

  @Delete()
  @ApiOperation({ summary: 'Очистить корзину' })
  clearCart(@Request() req: RequestWithUser) {
    return this.cartService.clearCart(req.user.id);
  }
}
