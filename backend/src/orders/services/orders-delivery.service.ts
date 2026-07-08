import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CartService } from '../../cart/cart.service';
import type { CalculateDeliveryDto } from '../dto/calculate-delivery.dto';
import { DeliveryType } from '../dto/calculate-delivery.dto';

export const DEFAULT_APPROVAL_VALID_MINUTES = 60;

@Injectable()
export class OrdersDeliveryService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
  ) {}

  /**
   * Список населённых пунктов и режим оплаты доставки (для корзины).
   */
  async getDeliverySettlements(): Promise<{
    settlements: Array<{ name: string; price: number }>;
    deliveryPaymentMode: 'WITH_ORDER' | 'ON_SITE';
    approvalValidMinutes: number;
  }> {
    const config = await this.getDeliveryConfig();
    const mode = config.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    const approvalValidMinutes =
      (config as { approvalValidMinutes?: number }).approvalValidMinutes ??
      DEFAULT_APPROVAL_VALID_MINUTES;
    return {
      settlements: (config.settlements ?? []).map((s) => ({
        name: s.name,
        price: Number(s.price),
      })),
      deliveryPaymentMode: mode,
      approvalValidMinutes,
    };
  }

  /**
   * Список активных способов доставки (для выбора в корзине).
   */
  async getShippingMethods() {
    return this.prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Конфиг расчёта доставки (одна запись). Если нет — создаём с дефолтами.
   */
  async getDeliveryConfig() {
    let config = await this.prisma.deliveryConfig.findFirst({
      include: { settlements: { orderBy: { order: 'asc' } } },
    });
    if (!config) {
      config = await this.prisma.deliveryConfig.create({
        data: {
          deliveryPriceMurmansk: 500,
          deliveryPricePerKmOutside: 50,
          moversPriceMurmansk: 300,
          moversPriceOutside: 400,
          moversKgPerPerson: 50,
          moversVolumePerPerson: 0.5,
          approvalValidMinutes: DEFAULT_APPROVAL_VALID_MINUTES,
        },
        include: { settlements: { orderBy: { order: 'asc' } } },
      });
    }
    return config;
  }

  /**
   * Базовая стоимость доставки (из первого активного способа или 0). Используется при submit без формы доставки.
   */
  async getBaseDeliveryCost(subtotal: number): Promise<{ cost: number; methodId: string | null }> {
    const method = await this.prisma.shippingMethod.findFirst({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    if (!method) return { cost: 0, methodId: null };
    const price = Number(method.price);
    const freeFrom = method.freeFromAmount != null ? Number(method.freeFromAmount) : null;
    const cost = freeFrom != null && subtotal >= freeFrom ? 0 : price;
    return { cost, methodId: method.id };
  }

  /**
   * Расчёт стоимости доставки по конфигу: lookup по населённому пункту, иначе за км; грузчики по массе и габаритам.
   * @param optionalCartItems — при указании используются эти позиции вместо корзины (для расчёта при submit с cartItemIds).
   */
  async calculateDelivery(
    userId: string,
    dto: CalculateDeliveryDto,
    optionalCartItems?: Awaited<ReturnType<CartService['getCartItems']>>,
  ): Promise<{ deliveryCost: number; carryCost: number; totalShippingCost: number }> {
    const config = await this.getDeliveryConfig();
    const cityNorm = (dto.city || '').trim().toLowerCase();

    const settlement = config.settlements?.find(
      (s) => cityNorm && cityNorm.includes((s.name || '').trim().toLowerCase()),
    );
    const isInSettlementsList = !!settlement;
    const deliveryCost = settlement
      ? Number(settlement.price)
      : Math.max(0, dto.distanceKm ?? 0) * Number(config.deliveryPricePerKmOutside);

    let carryCost = 0;
    if (dto.deliveryType === DeliveryType.TO_APARTMENT) {
      const cartItems = optionalCartItems ?? (await this.cartService.getCartItems(userId));
      const productIds = [
        ...new Set([
          ...cartItems.filter((i) => i.productId).map((i) => i.productId as string),
          ...cartItems
            .filter((i) => i.component && (i.component as { productId?: string }).productId)
            .map((i) => (i.component as { productId: string }).productId),
        ]),
      ].filter(Boolean);
      const products = productIds.length
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, weight: true, width: true, height: true, length: true },
          })
        : [];
      let totalWeight = 0;
      let totalVolume = 0;
      for (const item of cartItems) {
        const qty = Math.max(0.5, Number(item.quantity) || 1);
        const productId =
          item.productId ?? (item.component as { productId?: string } | null)?.productId;
        const p = productId ? products.find((x) => x.id === productId) : null;
        const w = p?.weight != null ? Number(p.weight) : 20;
        const vol =
          p?.width != null && p?.height != null && p?.length != null
            ? Number(p.width) * Number(p.height) * Number(p.length) * 1e-6
            : 0.1;
        totalWeight += w * qty;
        totalVolume += vol * qty;
      }
      const kgPerPerson = Number(config.moversKgPerPerson) || 50;
      const volPerPerson =
        config.moversVolumePerPerson != null ? Number(config.moversVolumePerPerson) : null;
      const byWeight = kgPerPerson > 0 ? Math.ceil(totalWeight / kgPerPerson) : 0;
      const byVolume =
        volPerPerson != null && volPerPerson > 0 ? Math.ceil(totalVolume / volPerPerson) : 0;
      const moversCount = Math.max(1, byWeight, byVolume);
      const moversPrice = isInSettlementsList
        ? Number(config.moversPriceMurmansk)
        : Number(config.moversPriceOutside);
      carryCost = moversCount * moversPrice;
    }

    return {
      deliveryCost,
      carryCost,
      totalShippingCost: deliveryCost + carryCost,
    };
  }
}
