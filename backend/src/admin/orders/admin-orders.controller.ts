import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminOrdersService } from './admin-orders.service';
import { OrdersService } from '../../orders/orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubmitFromCartForCustomerDto } from '../../orders/dto/submit-from-cart-for-customer.dto';
import { CreateServiceOrderDto } from '../../orders/dto/create-service-order.dto';
import { UpdateServiceOrderCustomerDto } from '../../orders/dto/update-service-order-customer.dto';
import type { RequestWithUser } from '../../common/types/request-with-user.types';

@Controller('admin/orders')
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MODERATOR', 'SUPPORT', 'MANAGER')
export class AdminOrdersController {
  constructor(
    private readonly adminOrdersService: AdminOrdersService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('orderNumber') orderNumber?: string,
    @Query('customer') customer?: string,
    @Query('manager') manager?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minTotal') minTotal?: string,
    @Query('maxTotal') maxTotal?: string,
    @Query('hasDelivery') hasDelivery?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminOrdersService.findAll({
      status,
      paymentStatus,
      userId,
      search,
      orderNumber,
      customer,
      manager,
      dateFrom,
      dateTo,
      minTotal: minTotal ? parseFloat(minTotal) : undefined,
      maxTotal: maxTotal ? parseFloat(maxTotal) : undefined,
      hasDelivery: hasDelivery === 'true' || hasDelivery === '1',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  getStats(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.adminOrdersService.getStats(dateFrom, dateTo);
  }

  @Get('products-for-replacement')
  getProductsForReplacement(@Query('search') search?: string, @Query('limit') limit?: string) {
    return this.adminOrdersService.getProductsForReplacement(
      search,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('service-order')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'CONTENT_MANAGER',
    'MODERATOR',
    'SUPPORT',
    'PARTNER',
    'MANAGER',
    'TECHNOLOGIST',
    'BRIGADIER',
    'LEAD_SPECIALIST_FURNITURE',
    'LEAD_SPECIALIST_WINDOWS_DOORS',
    'SURVEYOR',
    'DRIVER',
    'INSTALLER',
  )
  createServiceOrder(@Request() req: RequestWithUser, @Body() dto: CreateServiceOrderDto) {
    return this.ordersService.createServiceOrder(req.user.id, req.user.role, dto);
  }

  @Post('submit-from-cart-for-customer')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'CONTENT_MANAGER',
    'MODERATOR',
    'SUPPORT',
    'PARTNER',
    'MANAGER',
    'TECHNOLOGIST',
    'BRIGADIER',
    'LEAD_SPECIALIST_FURNITURE',
    'LEAD_SPECIALIST_WINDOWS_DOORS',
    'SURVEYOR',
    'DRIVER',
    'INSTALLER',
  )
  submitFromCartForCustomer(
    @Request() req: RequestWithUser,
    @Body() dto: SubmitFromCartForCustomerDto,
  ) {
    return this.ordersService.submitFromCartForCustomer(req.user.id, req.user.role, dto);
  }

  @Get('service-orders')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  getServiceOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminOrdersService.getServiceOrders({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('service-order/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  getServiceOrder(@Param('id') id: string) {
    return this.adminOrdersService.getServiceOrder(id);
  }

  @Patch('service-order/:id/customer')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  updateServiceOrderCustomer(@Param('id') id: string, @Body() dto: UpdateServiceOrderCustomerDto) {
    return this.ordersService.updateServiceOrderCustomer(id, dto);
  }

  @Get('delivery-config')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getDeliveryConfig() {
    return this.adminOrdersService.getDeliveryConfig();
  }

  @Patch('delivery-config')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateDeliveryConfig(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      deliveryPricePerKmOutside?: number;
      deliveryPaymentMode?: 'WITH_ORDER' | 'ON_SITE';
      moversPriceMurmansk?: number;
      moversPriceOutside?: number;
      moversKgPerPerson?: number;
      moversVolumePerPerson?: number | null;
      settlements?: Array<{ id?: string; name: string; price: number; order?: number }>;
      rolesAllowedOrderForCustomer?: string[] | null;
      approvalValidMinutes?: number;
    },
  ) {
    return this.adminOrdersService.updateDeliveryConfig(body, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminOrdersService.findOne(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  removeOrder(@Param('id') id: string) {
    return this.adminOrdersService.deleteOrder(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminOrdersService.updateStatus(id, body.status, req.user.id);
  }

  @Patch(':id/customer')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  updateOrderCustomer(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body()
    body: {
      customerEmail?: string | null;
      customerPhone?: string | null;
      customerFirstName?: string | null;
      customerMiddleName?: string | null;
      customerLastName?: string | null;
    },
  ) {
    return this.adminOrdersService.updateOrderCustomer(id, body, req.user.id);
  }

  @Patch(':id/delivery')
  updateOrderDelivery(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body()
    body: {
      shippingCost?: number;
      carryCost?: number | null;
      moversCount?: number | null;
      plannedDeliveryDate?: string | null;
    },
  ) {
    return this.adminOrdersService.updateOrderDelivery(id, body, req.user.id);
  }

  @Patch(':id/items/:itemId')
  updateOrderItem(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { managerComment?: string | null },
  ) {
    return this.adminOrdersService.updateOrderItem(id, itemId, body, req.user.id);
  }

  @Post(':id/send-back')
  sendBackToCustomer(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { comment?: string },
  ) {
    return this.adminOrdersService.sendBackToCustomer(id, body.comment, req.user.id);
  }

  @Post(':id/send-to-email')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MANAGER')
  sendOrderToCustomerEmail(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.adminOrdersService.sendOrderToCustomerEmail(id, req.user.id);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.adminOrdersService.cancelOrder(id, body.reason);
  }

  @Post(':id/refund')
  refundOrder(@Param('id') id: string, @Body() body: { amount?: number; reason?: string }) {
    return this.adminOrdersService.refundOrder(id, body.amount, body.reason);
  }

  @Patch(':id/tracking')
  updateTracking(@Param('id') id: string, @Body() body: { trackingNumber: string }) {
    return this.adminOrdersService.updateTracking(id, body.trackingNumber);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() body: { note: string }) {
    return this.adminOrdersService.addNote(id, body.note);
  }

  // Payments
  @Post(':orderId/payments/:paymentId/confirm')
  confirmPayment(
    @Param('orderId') orderId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { transactionId?: string },
  ) {
    return this.adminOrdersService.confirmPayment(orderId, paymentId, body.transactionId);
  }

  @Post('payments/:paymentId/refund')
  refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.adminOrdersService.refundPayment(paymentId, body.amount, body.reason);
  }

  // Shipping Methods
  @Get('shipping-methods')
  @Roles('ADMIN')
  getShippingMethods() {
    return this.adminOrdersService.getShippingMethods();
  }

  @Post('shipping-methods')
  @Roles('ADMIN')
  createShippingMethod(
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      price: number;
      freeFromAmount?: number;
      minDeliveryDays?: number;
      maxDeliveryDays?: number;
      isActive?: boolean;
    },
  ) {
    return this.adminOrdersService.createShippingMethod(body);
  }

  @Patch('shipping-methods/:id')
  @Roles('ADMIN')
  updateShippingMethod(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string;
      price: number;
      freeFromAmount: number;
      minDeliveryDays: number;
      maxDeliveryDays: number;
      isActive: boolean;
      order: number;
    }>,
  ) {
    return this.adminOrdersService.updateShippingMethod(id, body);
  }

  @Delete('shipping-methods/:id')
  @Roles('ADMIN')
  deleteShippingMethod(@Param('id') id: string) {
    return this.adminOrdersService.deleteShippingMethod(id);
  }

  // Payment Methods
  @Get('payment-methods')
  @Roles('ADMIN')
  getPaymentMethods() {
    return this.adminOrdersService.getPaymentMethods();
  }

  @Post('payment-methods')
  @Roles('ADMIN')
  createPaymentMethod(
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      icon?: string;
      isActive?: boolean;
    },
  ) {
    return this.adminOrdersService.createPaymentMethod(body);
  }

  @Patch('payment-methods/:id')
  @Roles('ADMIN')
  updatePaymentMethod(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string;
      icon: string;
      isActive: boolean;
      order: number;
    }>,
  ) {
    return this.adminOrdersService.updatePaymentMethod(id, body);
  }

  @Delete('payment-methods/:id')
  @Roles('ADMIN')
  deletePaymentMethod(@Param('id') id: string) {
    return this.adminOrdersService.deletePaymentMethod(id);
  }
}
