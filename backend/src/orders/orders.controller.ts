import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Public } from '../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AddCartItemToOrderDto } from './dto/add-cart-item-to-order.dto';
import { SubmitFromCartDto } from './dto/submit-from-cart.dto';
import { CalculateDeliveryDto } from './dto/calculate-delivery.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать заказ' })
  create(@Request() req: RequestWithUser, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Get('view-by-token')
  @Public()
  @ApiOperation({ summary: 'Получить заказ по токену из письма (публично)' })
  findOneByViewToken(@Query('token') token: string) {
    return this.ordersService.findOneByViewToken(token);
  }

  @Get('can-place-service-order')
  @ApiOperation({ summary: 'Может ли текущий пользователь оформлять заказ услуг для клиента' })
  async canPlaceServiceOrder(@Request() req: RequestWithUser) {
    const canPlace = await this.ordersService.canPlaceServiceOrder(req.user.role);
    return { canPlace };
  }

  @Get('delivery-settlements')
  @ApiOperation({ summary: 'Список населённых пунктов для выбора города доставки' })
  getDeliverySettlements() {
    return this.ordersService.getDeliverySettlements();
  }

  @Get('shipping-methods')
  @ApiOperation({ summary: 'Список способов доставки для корзины' })
  getShippingMethods() {
    return this.ordersService.getShippingMethods();
  }

  @Post('submit-from-cart')
  @ApiOperation({ summary: 'Отправить заказ из корзины на проверку менеджеру' })
  submitFromCart(@Request() req: RequestWithUser, @Body() body?: SubmitFromCartDto) {
    return this.ordersService.submitFromCart(req.user.id, body, req.user.role);
  }

  @Post('calculate-delivery')
  @ApiOperation({ summary: 'Рассчитать стоимость доставки и подъёма' })
  calculateDelivery(@Request() req: RequestWithUser, @Body() dto: CalculateDeliveryDto) {
    return this.ordersService.calculateDelivery(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все заказы' })
  findAll(@Request() req: RequestWithUser) {
    return this.ordersService.findAll(req.user.id, req.user.role);
  }

  @Post(':id/cancel-by-customer')
  @ApiOperation({ summary: 'Отменить проверку заказа (покупатель)' })
  cancelByCustomer(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.ordersService.cancelByCustomer(id, req.user.id);
  }

  @Post(':id/add-cart-item')
  @ApiOperation({ summary: 'Добавить позицию из корзины в заказ на проверке' })
  addCartItemToOrder(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: AddCartItemToOrderDto,
  ) {
    return this.ordersService.addCartItemToOrder(id, dto.cartItemId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заказ по ID' })
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить заказ' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить заказ' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
