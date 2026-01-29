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
} from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MODERATOR', 'SUPPORT')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minTotal') minTotal?: string,
    @Query('maxTotal') maxTotal?: string,
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
      dateFrom,
      dateTo,
      minTotal: minTotal ? parseFloat(minTotal) : undefined,
      maxTotal: maxTotal ? parseFloat(maxTotal) : undefined,
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.adminOrdersService.updateStatus(id, body.status);
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
