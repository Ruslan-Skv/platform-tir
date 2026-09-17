import { Injectable, Logger } from '@nestjs/common';
import { ContractDocumentPackageKind, PaymentForm, PaymentType, Prisma } from '@prisma/client';

import { PACKAGE_DIRECTION_REGISTRY } from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';

const PACKAGE_KIND_DIRECTION_NAME: Record<ContractDocumentPackageKind, string> = Object.fromEntries(
  PACKAGE_DIRECTION_REGISTRY.map((d) => [d.kind, d.name]),
) as Record<ContractDocumentPackageKind, string>;

function contractNumberFromFormData(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const contract = (formData as Record<string, unknown>).contract;
  if (!contract || typeof contract !== 'object') return null;
  const num = (contract as Record<string, unknown>).number;
  return typeof num === 'string' && num.trim() ? num.trim() : null;
}

function customerNameFromFormData(formData: unknown): string | null {
  if (!formData || typeof formData !== 'object') return null;
  const customer = (formData as Record<string, unknown>).customer;
  if (!customer || typeof customer !== 'object') return null;
  const fullName = (customer as Record<string, unknown>).fullName;
  return typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;
}

type PackagePaymentRow = {
  id: string;
  packageId: string;
  paymentDate: Date;
  amount: Prisma.Decimal;
  paymentForm: PaymentForm;
  paymentType: PaymentType;
  addendumNumber: number | null;
  basis: string | null;
  notes: string | null;
  recordedById: string | null;
  createdAt: Date;
};

@Injectable()
export class MoneyMovementsService {
  private readonly logger = new Logger(MoneyMovementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    managerId?: string;
    direction?: string;
    paymentForm?: string;
    paymentType?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      managerId,
      direction,
      paymentForm,
      paymentType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = params || {};
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (page - 1) * take;

    const where: Prisma.MoneyMovementWhereInput = {};
    if (managerId) where.managerId = managerId;
    if (direction) where.direction = direction;
    if (paymentForm) where.paymentForm = paymentForm as Prisma.EnumPaymentFormFilter;
    if (paymentType) where.paymentType = paymentType as Prisma.EnumPaymentTypeFilter;
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) where.paymentDate.lte = new Date(dateTo);
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { contractNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { basis: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rawData, total, sum, managerGroups] = await Promise.all([
      this.prisma.moneyMovement.findMany({
        where,
        include: {
          manager: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: [{ paymentDate: 'desc' }, { performedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.moneyMovement.count({ where }),
      this.prisma.moneyMovement.aggregate({ where, _sum: { amount: true } }),
      this.prisma.moneyMovement.groupBy({
        by: ['managerId'],
        where: { managerId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const managerIds = managerGroups
      .map((g) => g.managerId)
      .filter((id): id is string => Boolean(id));
    const managerRows = managerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];

    const managers = managerRows
      .map((m) => ({
        id: m.id,
        name: [m.lastName, m.firstName].filter(Boolean).join(' ').trim() || m.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return {
      data: rawData.map((row) => this.serialize(row)),
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
      totalSum: Number(sum._sum.amount ?? 0),
      managers,
    };
  }

  private serialize(
    row: Prisma.MoneyMovementGetPayload<{
      include: { manager: { select: { id: true; email: true; firstName: true; lastName: true } } };
    }>,
  ) {
    return {
      id: row.id,
      sourceId: row.sourceId,
      packageId: row.packageId,
      contractId: row.contractId,
      paymentDate: row.paymentDate.toISOString().slice(0, 10),
      performedAt: row.performedAt.toISOString(),
      amount: row.amount.toString(),
      paymentForm: row.paymentForm,
      paymentType: row.paymentType,
      addendumNumber: row.addendumNumber,
      basis: row.basis,
      notes: row.notes,
      contractNumber: row.contractNumber,
      customerName: row.customerName,
      direction: row.direction,
      manager: row.manager
        ? {
            id: row.manager.id,
            name:
              [row.manager.lastName, row.manager.firstName].filter(Boolean).join(' ').trim() ||
              row.manager.email,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Создаёт запись ДП по новой оплате в «Оплаты и Управление договором».
   * Ошибка журнала не должна ломать операцию оплаты — пишем в лог и продолжаем.
   */
  async recordFromPackagePayment(payment: PackagePaymentRow): Promise<void> {
    try {
      const pkg = await this.prisma.contractDocumentPackage.findUnique({
        where: { id: payment.packageId },
        select: {
          kind: true,
          formData: true,
          crmContract: { select: { id: true, contractNumber: true, customerName: true } },
          documentObject: { select: { customerName: true } },
        },
      });

      await this.prisma.moneyMovement.create({
        data: {
          sourceId: payment.id,
          packageId: payment.packageId,
          contractId: pkg?.crmContract?.id ?? null,
          paymentDate: payment.paymentDate,
          performedAt: payment.createdAt,
          amount: payment.amount,
          paymentForm: payment.paymentForm,
          paymentType: payment.paymentType,
          addendumNumber: payment.addendumNumber,
          basis: payment.basis,
          notes: payment.notes,
          managerId: payment.recordedById,
          contractNumber:
            pkg?.crmContract?.contractNumber ?? contractNumberFromFormData(pkg?.formData) ?? null,
          customerName:
            pkg?.crmContract?.customerName ??
            customerNameFromFormData(pkg?.formData) ??
            pkg?.documentObject?.customerName ??
            null,
          direction: pkg ? (PACKAGE_KIND_DIRECTION_NAME[pkg.kind] ?? pkg.kind) : null,
        },
      });
    } catch (error) {
      this.logger.error(
        `ДП: не удалось записать движение по оплате ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Синхронизирует запись ДП после изменения оплаты (по sourceId). */
  async syncFromPackagePayment(payment: PackagePaymentRow): Promise<void> {
    try {
      const existing = await this.prisma.moneyMovement.findUnique({
        where: { sourceId: payment.id },
        select: { id: true },
      });
      if (!existing) {
        await this.recordFromPackagePayment(payment);
        return;
      }
      await this.prisma.moneyMovement.update({
        where: { id: existing.id },
        data: {
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          paymentForm: payment.paymentForm,
          paymentType: payment.paymentType,
          addendumNumber: payment.addendumNumber,
          basis: payment.basis,
          notes: payment.notes,
        },
      });
    } catch (error) {
      this.logger.error(
        `ДП: не обновить движение по оплате ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Удаляет запись ДП при удалении оплаты. */
  async removeBySourceId(sourceId: string): Promise<void> {
    try {
      await this.prisma.moneyMovement.deleteMany({ where: { sourceId } });
    } catch (error) {
      this.logger.error(
        `ДП: не удалить движение по оплате ${sourceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
