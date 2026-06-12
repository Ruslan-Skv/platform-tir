import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export const DEFAULT_APPROVAL_VALID_MINUTES = 60;

@Injectable()
export class AdminOrdersDeliverySettingsService {
  constructor(private prisma: PrismaService) {}

  /** Настройки расчёта доставки (населённые пункты, грузчики). */
  async getDeliveryConfig() {
    let config = await this.prisma.deliveryConfig.findFirst({
      include: {
        settlements: { orderBy: { order: 'asc' } },
      },
    });
    if (!config) {
      config = await this.prisma.deliveryConfig.create({
        data: {
          deliveryPriceMurmansk: 500,
          deliveryPricePerKmOutside: 50,
          deliveryPaymentMode: 'WITH_ORDER',
          moversPriceMurmansk: 300,
          moversPriceOutside: 400,
          moversKgPerPerson: 50,
          moversVolumePerPerson: 0.5,
          approvalValidMinutes: DEFAULT_APPROVAL_VALID_MINUTES,
        },
        include: {
          settlements: { orderBy: { order: 'asc' } },
        },
      });
    }
    const raw = config as unknown as { rolesAllowedOrderForCustomer?: unknown };
    const rolesAllowed =
      Array.isArray(raw.rolesAllowedOrderForCustomer) && raw.rolesAllowedOrderForCustomer.length > 0
        ? (raw.rolesAllowedOrderForCustomer as string[])
        : ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    return { ...config, rolesAllowedOrderForCustomer: rolesAllowed };
  }

  /** Обновить настройки расчёта доставки. Только супер-админ может менять rolesAllowedOrderForCustomer. */
  async updateDeliveryConfig(
    data: {
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
    currentUserRole?: string,
  ) {
    const config = await this.getDeliveryConfig();
    const updateData: Prisma.DeliveryConfigUpdateInput = {};
    if (data.deliveryPricePerKmOutside !== undefined)
      updateData.deliveryPricePerKmOutside = data.deliveryPricePerKmOutside;
    if (data.deliveryPaymentMode !== undefined)
      updateData.deliveryPaymentMode = data.deliveryPaymentMode;
    if (data.moversPriceMurmansk !== undefined)
      updateData.moversPriceMurmansk = data.moversPriceMurmansk;
    if (data.moversPriceOutside !== undefined)
      updateData.moversPriceOutside = data.moversPriceOutside;
    if (data.moversKgPerPerson !== undefined) updateData.moversKgPerPerson = data.moversKgPerPerson;
    if (data.moversVolumePerPerson !== undefined)
      updateData.moversVolumePerPerson = data.moversVolumePerPerson;
    if (data.approvalValidMinutes !== undefined) {
      const mins = Math.max(1, Math.min(1440, data.approvalValidMinutes)); // 1–1440 мин (24 ч)
      updateData.approvalValidMinutes = mins;
    }

    if (data.rolesAllowedOrderForCustomer !== undefined) {
      if (currentUserRole !== 'SUPER_ADMIN') {
        throw new ForbiddenException(
          'Только супер-администратор может изменять список ролей для оформления заказов за клиента',
        );
      }
      updateData.rolesAllowedOrderForCustomer =
        data.rolesAllowedOrderForCustomer == null || data.rolesAllowedOrderForCustomer.length === 0
          ? Prisma.JsonNull
          : (data.rolesAllowedOrderForCustomer as unknown as Prisma.InputJsonValue);
    }

    if (data.settlements !== undefined) {
      await this.prisma.deliverySettlement.deleteMany({ where: { configId: config.id } });
      if (data.settlements.length > 0) {
        await this.prisma.deliverySettlement.createMany({
          data: data.settlements.map((s, i) => ({
            configId: config.id,
            name: s.name.trim(),
            price: s.price,
            order: s.order ?? i,
          })),
        });
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.deliveryConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    }

    const updated = await this.prisma.deliveryConfig.findFirstOrThrow({
      where: { id: config.id },
      include: { settlements: { orderBy: { order: 'asc' } } },
    });
    const raw = updated as unknown as { rolesAllowedOrderForCustomer?: unknown };
    const rolesAllowed =
      Array.isArray(raw.rolesAllowedOrderForCustomer) && raw.rolesAllowedOrderForCustomer.length > 0
        ? (raw.rolesAllowedOrderForCustomer as string[])
        : ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    return { ...updated, rolesAllowedOrderForCustomer: rolesAllowed };
  }

  // Shipping Methods
  async getShippingMethods() {
    return this.prisma.shippingMethod.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createShippingMethod(data: {
    name: string;
    code: string;
    description?: string;
    price: number;
    freeFromAmount?: number;
    minDeliveryDays?: number;
    maxDeliveryDays?: number;
    isActive?: boolean;
  }) {
    return this.prisma.shippingMethod.create({
      data: {
        ...data,
        price: new Prisma.Decimal(data.price),
        freeFromAmount: data.freeFromAmount ? new Prisma.Decimal(data.freeFromAmount) : null,
      },
    });
  }

  async updateShippingMethod(
    id: string,
    data: Partial<{
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
    const updateData: Prisma.ShippingMethodUpdateInput = {
      name: data.name,
      description: data.description,
      minDeliveryDays: data.minDeliveryDays,
      maxDeliveryDays: data.maxDeliveryDays,
      isActive: data.isActive,
      order: data.order,
    };
    if (data.price !== undefined) {
      updateData.price = new Prisma.Decimal(data.price);
    }
    if (data.freeFromAmount !== undefined) {
      updateData.freeFromAmount = new Prisma.Decimal(data.freeFromAmount);
    }

    return this.prisma.shippingMethod.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteShippingMethod(id: string) {
    return this.prisma.shippingMethod.delete({
      where: { id },
    });
  }

  // Payment Methods
  async getPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createPaymentMethod(data: {
    name: string;
    code: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
  }) {
    return this.prisma.paymentMethod.create({
      data,
    });
  }

  async updatePaymentMethod(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      icon: string;
      isActive: boolean;
      order: number;
    }>,
  ) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }

  async deletePaymentMethod(id: string) {
    return this.prisma.paymentMethod.delete({
      where: { id },
    });
  }
}
