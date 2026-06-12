import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AdminOrdersQueryService } from './admin-orders-query.service';
import { AdminOrdersMutationsService } from './admin-orders-mutations.service';
import { AdminOrdersDeliverySettingsService } from './admin-orders-delivery-settings.service';

@Injectable()
export class AdminOrdersService {
  constructor(
    private prisma: PrismaService,
    private query: AdminOrdersQueryService,
    private mutations: AdminOrdersMutationsService,
    private deliverySettings: AdminOrdersDeliverySettingsService,
  ) {}

  async getStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.OrderWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      revenue,
      avgOrderValue,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { ...where, status: 'SHIPPED' } }),
      this.prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.order.count({ where: { ...where, status: 'REFUNDED' } }),
      this.prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where,
        _avg: { total: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      revenue: revenue._sum.total || 0,
      avgOrderValue: avgOrderValue._avg.total || 0,
    };
  }

  findAll(params?: Parameters<AdminOrdersQueryService['findAll']>[0]) {
    return this.query.findAll(params);
  }

  getServiceOrders(params?: Parameters<AdminOrdersQueryService['getServiceOrders']>[0]) {
    return this.query.getServiceOrders(params);
  }

  getServiceOrder(id: string) {
    return this.query.getServiceOrder(id);
  }

  findOne(id: string) {
    return this.query.findOne(id);
  }

  deleteOrder(id: string) {
    return this.mutations.deleteOrder(id);
  }

  updateOrderItem(
    orderId: string,
    itemId: string,
    data: { managerComment?: string | null },
    managerId?: string,
  ) {
    return this.mutations.updateOrderItem(orderId, itemId, data, managerId);
  }

  updateOrderDelivery(
    orderId: string,
    data: {
      shippingCost?: number;
      carryCost?: number | null;
      moversCount?: number | null;
      plannedDeliveryDate?: string | null;
    },
    managerId?: string,
  ) {
    return this.mutations.updateOrderDelivery(orderId, data, managerId);
  }

  sendBackToCustomer(orderId: string, comment?: string, managerId?: string) {
    return this.mutations.sendBackToCustomer(orderId, comment, managerId);
  }

  sendOrderToCustomerEmail(orderId: string, managerId: string) {
    return this.mutations.sendOrderToCustomerEmail(orderId, managerId);
  }

  updateOrderCustomer(
    orderId: string,
    data: {
      customerEmail?: string | null;
      customerPhone?: string | null;
      customerFirstName?: string | null;
      customerMiddleName?: string | null;
      customerLastName?: string | null;
    },
    managerId?: string,
  ) {
    return this.mutations.updateOrderCustomer(orderId, data, managerId);
  }

  getProductsForReplacement(search?: string, limit = 50) {
    return this.mutations.getProductsForReplacement(search, limit);
  }

  getDeliveryConfig() {
    return this.deliverySettings.getDeliveryConfig();
  }

  updateDeliveryConfig(
    data: Parameters<AdminOrdersDeliverySettingsService['updateDeliveryConfig']>[0],
    currentUserRole?: string,
  ) {
    return this.deliverySettings.updateDeliveryConfig(data, currentUserRole);
  }

  updateStatus(id: string, status: string, managerId?: string) {
    return this.mutations.updateStatus(id, status, managerId);
  }

  cancelOrder(id: string, reason?: string) {
    return this.mutations.cancelOrder(id, reason);
  }

  refundOrder(id: string, amount?: number, reason?: string) {
    return this.mutations.refundOrder(id, amount, reason);
  }

  updateTracking(id: string, trackingNumber: string) {
    return this.mutations.updateTracking(id, trackingNumber);
  }

  addNote(id: string, note: string) {
    return this.mutations.addNote(id, note);
  }

  confirmPayment(orderId: string, paymentId: string, transactionId?: string) {
    return this.mutations.confirmPayment(orderId, paymentId, transactionId);
  }

  refundPayment(paymentId: string, amount?: number, reason?: string) {
    return this.mutations.refundPayment(paymentId, amount, reason);
  }

  getShippingMethods() {
    return this.deliverySettings.getShippingMethods();
  }

  createShippingMethod(
    data: Parameters<AdminOrdersDeliverySettingsService['createShippingMethod']>[0],
  ) {
    return this.deliverySettings.createShippingMethod(data);
  }

  updateShippingMethod(
    id: string,
    data: Parameters<AdminOrdersDeliverySettingsService['updateShippingMethod']>[1],
  ) {
    return this.deliverySettings.updateShippingMethod(id, data);
  }

  deleteShippingMethod(id: string) {
    return this.deliverySettings.deleteShippingMethod(id);
  }

  getPaymentMethods() {
    return this.deliverySettings.getPaymentMethods();
  }

  createPaymentMethod(
    data: Parameters<AdminOrdersDeliverySettingsService['createPaymentMethod']>[0],
  ) {
    return this.deliverySettings.createPaymentMethod(data);
  }

  updatePaymentMethod(
    id: string,
    data: Parameters<AdminOrdersDeliverySettingsService['updatePaymentMethod']>[1],
  ) {
    return this.deliverySettings.updatePaymentMethod(id, data);
  }

  deletePaymentMethod(id: string) {
    return this.deliverySettings.deletePaymentMethod(id);
  }
}
