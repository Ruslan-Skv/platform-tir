import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ContractDocumentPackageStatus,
  ContractDocumentSigningSessionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { normalizeEmail, normalizePhone } from '../common/utils/contact-normalize.util';
import { HISTORY_MAX_PACKAGES, parseHistoryQuery } from './dto/history-query.dto';
import type {
  HistoryContractItem,
  HistoryItem,
  HistoryOrderItem,
  HistoryPaymentItem,
  HistoryServiceOrderItem,
  UserHistoryResponse,
} from './types/history-item.types';

const PACKAGE_KIND_LABELS: Record<string, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  BLINDS: 'Жалюзи',
  FURNITURE: 'Мебель',
};

const PACKAGE_STATUS_LABELS: Record<ContractDocumentPackageStatus, string> = {
  IN_PROGRESS: 'В работе',
  CONTRACT_CONCLUDED: 'Договор заключён',
  REFUSED: 'Отказ',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
  APPROVED: 'На проверке',
  RETURNED_FOR_CORRECTION: 'На доработке',
};

const SERVICE_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждён',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  REFUNDED: 'Возврат',
};

type MatchedPackageRow = { id: string };

function parseRubAmount(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function extractPackageContractAmount(formData: unknown, crmTotal: unknown): number | null {
  if (formData && typeof formData === 'object' && !Array.isArray(formData)) {
    const fd = formData as Record<string, unknown>;
    const contract = fd.contract;
    if (contract && typeof contract === 'object' && !Array.isArray(contract)) {
      const fromContract = parseRubAmount((contract as Record<string, unknown>).totalAmount);
      if (fromContract != null) return fromContract;
    }
  }
  return parseRubAmount(crmTotal);
}

function extractPackageOccurredAt(
  formData: unknown,
  updatedAt: Date,
  status: ContractDocumentPackageStatus,
): Date {
  if (
    status === ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
    formData &&
    typeof formData === 'object'
  ) {
    const fd = formData as Record<string, unknown>;
    const contract = fd.contract;
    if (contract && typeof contract === 'object' && !Array.isArray(contract)) {
      const raw = (contract as Record<string, unknown>).contractDate;
      if (typeof raw === 'string' && raw.trim()) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
  }
  return updatedAt;
}

@Injectable()
export class UserHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<UserHistoryResponse> {
    const { page, limit } = parseHistoryQuery(params);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const emailNorm = normalizeEmail(user.email);
    const phoneNorm = normalizePhone(user.phone);

    const [orders, serviceOrders, packageIds, contractIdsFromCustomers] = await Promise.all([
      this.fetchOrders(userId),
      this.fetchServiceOrders(userId),
      this.findMatchedPackageIds(emailNorm, phoneNorm),
      this.findMatchedContractIds(emailNorm, phoneNorm),
    ]);

    const packages =
      packageIds.length > 0
        ? await this.prisma.contractDocumentPackage.findMany({
            where: { id: { in: packageIds }, deletedAt: null },
            select: {
              id: true,
              kind: true,
              title: true,
              status: true,
              formData: true,
              updatedAt: true,
              crmContractId: true,
              crmContract: {
                select: {
                  contractNumber: true,
                  totalAmount: true,
                },
              },
              signingSessions: {
                where: {
                  status: {
                    in: [
                      ContractDocumentSigningSessionStatus.PENDING,
                      ContractDocumentSigningSessionStatus.VIEWED,
                    ],
                  },
                  expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { token: true, customerEmail: true },
              },
            },
          })
        : [];

    const allContractIds = new Set<string>(contractIdsFromCustomers);
    for (const pkg of packages) {
      if (pkg.crmContractId) allContractIds.add(pkg.crmContractId);
    }

    const contractIdList = [...allContractIds];
    const orderIds = orders.map((o) => o.id);

    const [orderPayments, packagePayments, contractPayments] = await Promise.all([
      orderIds.length > 0
        ? this.prisma.payment.findMany({
            where: { orderId: { in: orderIds } },
            include: {
              order: { select: { orderNumber: true } },
            },
          })
        : [],
      packageIds.length > 0
        ? this.prisma.contractDocumentPackagePayment.findMany({
            where: { packageId: { in: packageIds } },
            include: {
              package: {
                select: {
                  title: true,
                  kind: true,
                  crmContract: { select: { contractNumber: true } },
                },
              },
            },
          })
        : [],
      contractIdList.length > 0
        ? this.prisma.contractPayment.findMany({
            where: { contractId: { in: contractIdList } },
            include: {
              contract: { select: { contractNumber: true } },
            },
          })
        : [],
    ]);

    const items: HistoryItem[] = [];

    for (const order of orders) {
      const orderItem: HistoryOrderItem = {
        id: `order:${order.id}`,
        type: 'order',
        occurredAt: order.createdAt.toISOString(),
        title: `Заказ ${order.orderNumber}`,
        amount: Number(order.total),
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
        subtitle: PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
        meta: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          itemsPreview: order.items.map((item) => ({
            id: item.id,
            name: item.product?.name ?? 'Товар',
            quantity: item.quantity,
          })),
          itemsTotal: order.items.length,
        },
      };
      items.push(orderItem);
    }

    for (const so of serviceOrders) {
      const serviceItem: HistoryServiceOrderItem = {
        id: `service_order:${so.id}`,
        type: 'service_order',
        occurredAt: so.createdAt.toISOString(),
        title: `Заказ услуг ${so.orderNumber}`,
        amount: Number(so.total),
        status: so.status,
        statusLabel: SERVICE_ORDER_STATUS_LABELS[so.status] ?? so.status,
        meta: {
          serviceOrderId: so.id,
          orderNumber: so.orderNumber,
        },
      };
      items.push(serviceItem);
    }

    for (const pkg of packages) {
      const kindLabel = PACKAGE_KIND_LABELS[pkg.kind] ?? pkg.kind;
      const contractNumber = pkg.crmContract?.contractNumber ?? null;
      const amount = extractPackageContractAmount(pkg.formData, pkg.crmContract?.totalAmount);
      const occurredAt = extractPackageOccurredAt(pkg.formData, pkg.updatedAt, pkg.status);

      let signUrl: string | null = null;
      const activeSession = pkg.signingSessions[0];
      if (activeSession && emailNorm && normalizeEmail(activeSession.customerEmail) === emailNorm) {
        signUrl = `/sign/${activeSession.token}`;
      }

      const contractItem: HistoryContractItem = {
        id: `contract:${pkg.id}`,
        type: 'contract',
        occurredAt: occurredAt.toISOString(),
        title: pkg.title?.trim() || `Договор: ${kindLabel}`,
        subtitle: contractNumber ? `№ ${contractNumber}` : kindLabel,
        amount,
        status: pkg.status,
        statusLabel: PACKAGE_STATUS_LABELS[pkg.status] ?? pkg.status,
        meta: {
          packageId: pkg.id,
          kind: pkg.kind,
          signUrl,
          contractNumber,
        },
      };
      items.push(contractItem);
    }

    for (const payment of orderPayments) {
      const occurredAt = payment.paidAt ?? payment.createdAt;
      const paymentItem: HistoryPaymentItem = {
        id: `payment:order:${payment.id}`,
        type: 'payment',
        occurredAt: occurredAt.toISOString(),
        title: 'Оплата по заказу',
        amount: Number(payment.amount),
        status: payment.status,
        statusLabel: PAYMENT_STATUS_LABELS[payment.status] ?? payment.status,
        subtitle: `Заказ ${payment.order.orderNumber}`,
        meta: {
          paymentId: payment.id,
          paymentSource: 'order',
          parentType: 'order',
          parentId: payment.orderId,
          parentLabel: payment.order.orderNumber,
        },
      };
      items.push(paymentItem);
    }

    for (const payment of packagePayments) {
      const pkg = payment.package;
      const kindLabel = PACKAGE_KIND_LABELS[pkg.kind] ?? pkg.kind;
      const label = pkg.crmContract?.contractNumber ?? pkg.title?.trim() ?? kindLabel;
      const paymentItem: HistoryPaymentItem = {
        id: `payment:pkg:${payment.id}`,
        type: 'payment',
        occurredAt: payment.paymentDate.toISOString(),
        title: 'Оплата по договору',
        amount: Number(payment.amount),
        status: 'PAID',
        statusLabel: 'Оплачено',
        subtitle: label,
        meta: {
          paymentId: payment.id,
          paymentSource: 'contract_package',
          parentType: 'contract_package',
          parentId: payment.packageId,
          parentLabel: label,
          paymentType: payment.paymentType,
          paymentForm: payment.paymentForm,
        },
      };
      items.push(paymentItem);
    }

    for (const payment of contractPayments) {
      const label = payment.contract.contractNumber;
      const paymentItem: HistoryPaymentItem = {
        id: `payment:crm:${payment.id}`,
        type: 'payment',
        occurredAt: payment.paymentDate.toISOString(),
        title: 'Оплата по договору',
        amount: Number(payment.amount),
        status: 'PAID',
        statusLabel: 'Оплачено',
        subtitle: `Договор № ${label}`,
        meta: {
          paymentId: payment.id,
          paymentSource: 'contract',
          parentType: 'contract',
          parentId: payment.contractId,
          parentLabel: label,
          paymentType: payment.paymentType,
          paymentForm: payment.paymentForm,
        },
      };
      items.push(paymentItem);
    }

    items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const total = items.length;
    const skip = (page - 1) * limit;
    const data = items.slice(skip, skip + limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    };
  }

  private fetchOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        items: {
          take: 5,
          select: {
            id: true,
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
    });
  }

  private fetchServiceOrders(userId: string) {
    return this.prisma.serviceOrder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });
  }

  private async findMatchedPackageIds(
    emailNorm: string | null,
    phoneNorm: string | null,
  ): Promise<string[]> {
    if (!emailNorm && !phoneNorm) return [];

    const phoneCondition = phoneNorm
      ? Prisma.sql`
          OR regexp_replace(coalesce(p.form_data->'customer'->>'phone', ''), '[^0-9]', '', 'g') = ${phoneNorm}
          OR regexp_replace(coalesce(c.customer_phone, ''), '[^0-9]', '', 'g') = ${phoneNorm}
          OR regexp_replace(coalesce(cu.phone, ''), '[^0-9]', '', 'g') = ${phoneNorm}
          OR EXISTS (
            SELECT 1 FROM unnest(coalesce(cu.phones, ARRAY[]::text[])) ph
            WHERE regexp_replace(ph, '[^0-9]', '', 'g') = ${phoneNorm}
          )
        `
      : Prisma.empty;

    const emailCondition = emailNorm
      ? Prisma.sql`
          lower(coalesce(p.form_data->'customer'->>'email', '')) = ${emailNorm}
          OR lower(coalesce(cu.email, '')) = ${emailNorm}
          OR lower(coalesce(s.customer_email, '')) = ${emailNorm}
        `
      : Prisma.sql`FALSE`;

    const rows = await this.prisma.$queryRaw<MatchedPackageRow[]>(
      Prisma.sql`
        SELECT DISTINCT p.id
        FROM contract_document_packages p
        LEFT JOIN contracts c ON c.id = p.crm_contract_id
        LEFT JOIN customers cu ON cu.id = c.customer_id AND cu.deleted_at IS NULL
        LEFT JOIN contract_document_signing_sessions s ON s.package_id = p.id
        WHERE p.deleted_at IS NULL
          AND (
            ${emailCondition}
            ${phoneCondition}
          )
        LIMIT ${HISTORY_MAX_PACKAGES}
      `,
    );

    return rows.map((r) => r.id);
  }

  private async findMatchedContractIds(
    emailNorm: string | null,
    phoneNorm: string | null,
  ): Promise<string[]> {
    if (!emailNorm && !phoneNorm) return [];

    const phoneCondition = phoneNorm
      ? Prisma.sql`
          OR regexp_replace(coalesce(c.customer_phone, ''), '[^0-9]', '', 'g') = ${phoneNorm}
          OR regexp_replace(coalesce(cu.phone, ''), '[^0-9]', '', 'g') = ${phoneNorm}
          OR EXISTS (
            SELECT 1 FROM unnest(coalesce(cu.phones, ARRAY[]::text[])) ph
            WHERE regexp_replace(ph, '[^0-9]', '', 'g') = ${phoneNorm}
          )
        `
      : Prisma.empty;

    const emailCondition = emailNorm
      ? Prisma.sql`lower(coalesce(cu.email, '')) = ${emailNorm}`
      : Prisma.sql`FALSE`;

    const rows = await this.prisma.$queryRaw<MatchedPackageRow[]>(
      Prisma.sql`
        SELECT DISTINCT c.id
        FROM contracts c
        LEFT JOIN customers cu ON cu.id = c.customer_id AND cu.deleted_at IS NULL
        WHERE (
          ${emailCondition}
          ${phoneCondition}
        )
        LIMIT 200
      `,
    );

    return rows.map((r) => r.id);
  }
}
