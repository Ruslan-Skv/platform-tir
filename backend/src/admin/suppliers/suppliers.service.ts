import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SaveSupplierDto } from './dto/save-supplier.dto';
import { SaveSupplierRequisiteDto } from './dto/save-requisite.dto';
import {
  SUPPLIER_BALANCE_STATUS,
  USER_BRIEF_SELECT,
  balanceStatus,
  parseDateOrThrow,
  roundMoney,
  serializeRequisite,
  serializeSupplier,
  userName,
} from './suppliers-serialize';

/** Карточка поставщика: сводный список сальдо, реквизиты, сама карточка.
 *  Ведомость расчётов (счета/оплаты) — в SuppliersLedgerService. */
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Корзина поставщиков: хранение 30 дней, затем безвозвратное удаление (как в ДП). */
  static readonly TRASH_RETENTION_DAYS = 30;
  private static readonly TRASH_RETENTION_MS =
    SuppliersService.TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // ---------- Сводный список (итоговая вкладка) ----------

  async getSummary(params: {
    search?: string;
    status?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const search = params.search?.trim();

    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { legalName: { contains: search, mode: 'insensitive' } },
              { commercialName: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { inn: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Поставщиков немного (десятки) — агрегаты ведомости берём одним groupBy,
    // сальдо считаем в памяти и уже по нему фильтруем/сортируем/режем страницу.
    const [suppliers, total, ledgerGroups, requisiteCounts] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy: { legalName: 'asc' } }),
      this.prisma.supplier.count({ where }),
      this.prisma.supplierLedgerEntry.groupBy({
        by: ['supplierId'],
        _sum: { amount: true, payment: true },
        _max: { date: true },
      }),
      this.prisma.supplierRequisite.groupBy({ by: ['supplierId'], _count: { _all: true } }),
    ]);

    const statsById = new Map(ledgerGroups.map((g) => [g.supplierId, g]));
    const requisiteCountById = new Map(requisiteCounts.map((g) => [g.supplierId, g._count._all]));

    let rows = suppliers.map((supplier) =>
      this.buildSummaryRow(
        supplier,
        statsById.get(supplier.id),
        requisiteCountById.get(supplier.id) ?? 0,
      ),
    );

    const status = params.status ?? 'ALL';
    if (status !== 'ALL') {
      rows = rows.filter((row) => row.status === status);
    }

    const sort = params.sort ?? 'name';
    const order = params.order === 'desc' ? -1 : 1;
    if (sort === 'balance') {
      rows.sort((a, b) => order * (a.balance - b.balance) || a.name.localeCompare(b.name, 'ru'));
    } else if (sort === 'lastEntry') {
      rows.sort((a, b) => {
        const at = a.lastEntryDate ? Date.parse(a.lastEntryDate) : 0;
        const bt = b.lastEntryDate ? Date.parse(b.lastEntryDate) : 0;
        return order * (at - bt) || a.name.localeCompare(b.name, 'ru');
      });
    } else {
      rows.sort(
        (a, b) =>
          order * a.name.localeCompare(b.name, 'ru') ||
          a.legalName.localeCompare(b.legalName, 'ru'),
      );
    }

    // Итоги считаем по отфильтрованному набору (как «Итого к оплате» на первой вкладке таблицы).
    const payable = roundMoney(
      rows.filter((r) => r.balance > 0.005).reduce((acc, r) => acc + r.balance, 0),
    );
    const overpay = roundMoney(
      rows.filter((r) => r.balance < -0.005).reduce((acc, r) => acc + r.balance, 0),
    );

    const start = (page - 1) * limit;
    return {
      data: rows.slice(start, start + limit),
      total: rows.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
      totals: {
        payable,
        overpay,
        suppliersWithDebt: rows.filter((r) => r.status === SUPPLIER_BALANCE_STATUS.PAYABLE).length,
        suppliersTotal: total,
      },
    };
  }

  private buildSummaryRow(
    supplier: Prisma.SupplierGetPayload<Record<string, never>>,
    stats:
      | {
          _sum: { amount: Prisma.Decimal | null; payment: Prisma.Decimal | null };
          _max: { date: Date | null };
        }
      | undefined,
    requisiteCount: number,
  ) {
    const amountSum = roundMoney(Number(stats?._sum.amount ?? 0));
    const paymentSum = roundMoney(Number(stats?._sum.payment ?? 0));
    const openingBalance = supplier.openingBalance != null ? Number(supplier.openingBalance) : 0;
    const balance = roundMoney(openingBalance + amountSum - paymentSum);
    const lastDate = stats?._max.date;
    return {
      id: supplier.id,
      legalName: supplier.legalName,
      commercialName: supplier.commercialName,
      name: supplier.commercialName || supplier.legalName,
      inn: supplier.inn,
      email: supplier.email,
      phone: supplier.phone,
      isActive: supplier.isActive,
      requisiteCount,
      openingBalance: supplier.openingBalance != null ? roundMoney(openingBalance) : null,
      amountSum,
      paymentSum,
      balance,
      status: balanceStatus(balance),
      lastEntryDate: lastDate ? lastDate.toISOString().slice(0, 10) : null,
    };
  }

  // ---------- Карточка поставщика ----------

  async getDetail(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { requisites: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    if (!supplier || supplier.deletedAt) throw new NotFoundException('Поставщик не найден');

    const [ledgerStats, productsCount] = await Promise.all([
      this.prisma.supplierLedgerEntry.aggregate({
        where: { supplierId: id },
        _sum: { amount: true, payment: true },
      }),
      this.prisma.productSupplier.count({ where: { supplierId: id } }),
    ]);

    const amountSum = roundMoney(Number(ledgerStats._sum.amount ?? 0));
    const paymentSum = roundMoney(Number(ledgerStats._sum.payment ?? 0));
    const openingBalance = supplier.openingBalance != null ? Number(supplier.openingBalance) : 0;
    const balance = roundMoney(openingBalance + amountSum - paymentSum);

    return {
      supplier: serializeSupplier(supplier),
      requisites: supplier.requisites.map(serializeRequisite),
      productsCount,
      stats: {
        openingBalance: supplier.openingBalance != null ? roundMoney(openingBalance) : null,
        amountSum,
        paymentSum,
        balance,
        status: balanceStatus(balance),
      },
    };
  }

  async create(dto: SaveSupplierDto) {
    assertLegalName(dto.legalName);
    await this.assertInnFree(normalizeOptionalText(dto.inn));
    const { openingBalance, openingBalanceDate, ...rest } = dto;
    const created = await this.prisma.supplier.create({
      data: {
        ...normalizeSupplierFields(rest),
        ...(openingBalance != null ? { openingBalance: new Prisma.Decimal(openingBalance) } : {}),
        ...(openingBalanceDate
          ? { openingBalanceDate: parseDateOrThrow(openingBalanceDate, 'Дата сальдо начального') }
          : {}),
      },
      include: { requisites: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    return serializeSupplier(created);
  }

  async update(id: string, dto: SaveSupplierDto) {
    assertLegalName(dto.legalName);
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Поставщик не найден');
    const nextInn = normalizeOptionalText(dto.inn);
    if (nextInn !== undefined && nextInn !== existing.inn) {
      await this.assertInnFree(nextInn);
    }

    const { openingBalance, openingBalanceDate, ...rest } = dto;
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...normalizeSupplierFields(rest),
        // Сальдо передаётся целиком: null/undefined очищают поле только когда
        // в DTO явным образом пришёл openingBalance (частичное обновление).
        ...(openingBalance !== undefined
          ? { openingBalance: openingBalance != null ? new Prisma.Decimal(openingBalance) : null }
          : {}),
        ...(openingBalanceDate !== undefined
          ? {
              openingBalanceDate: openingBalanceDate
                ? parseDateOrThrow(openingBalanceDate, 'Дата сальдо начального')
                : null,
            }
          : {}),
      },
      include: { requisites: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    return serializeSupplier(updated);
  }

  /** Удаление в корзину (супер-админ): записи ведомости и реквизиты остаются,
   *  из сводного списка и карточки поставщик исчезает. Через 30 дней — чистка. */
  async remove(id: string, actor: { id?: string; role?: string } = {}) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Поставщик не найден');
    if (supplier.deletedAt) throw new ConflictException('Поставщик уже удалён в корзину');

    const productsCount = await this.prisma.productSupplier.count({ where: { supplierId: id } });
    if (productsCount > 0) {
      throw new ConflictException(
        `К поставщику привязано товаров: ${productsCount}. Сначала отвяжите их в каталоге.`,
      );
    }

    await this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actor.id ?? null,
      },
    });
    return { deleted: true };
  }

  // ---------- Корзина (только супер-админ) ----------

  /** Корзина поставщиков: кто удалил, когда, безвозвратное удаление когда.
   *  Без восстановления — как в корзине ДП. */
  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 15, 1), 50);
    const search = params.search?.trim();

    const where: Prisma.SupplierWhereInput = {
      deletedAt: { not: null },
      ...(search
        ? {
            OR: [
              { legalName: { contains: search, mode: 'insensitive' } },
              { commercialName: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { inn: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { deletedBy: { select: USER_BRIEF_SELECT } },
      }),
    ]);

    const ids = suppliers.map((s) => s.id);
    const [ledgerGroups, requisiteCounts, entryCounts] = ids.length
      ? await Promise.all([
          this.prisma.supplierLedgerEntry.groupBy({
            by: ['supplierId'],
            where: { supplierId: { in: ids } },
            _sum: { amount: true, payment: true },
          }),
          this.prisma.supplierRequisite.groupBy({
            by: ['supplierId'],
            where: { supplierId: { in: ids } },
            _count: { _all: true },
          }),
          this.prisma.supplierLedgerEntry.groupBy({
            by: ['supplierId'],
            where: { supplierId: { in: ids } },
            _count: { _all: true },
          }),
        ])
      : [[], [], []];

    const sumsById = new Map(ledgerGroups.map((g) => [g.supplierId, g]));
    const requisiteCountById = new Map(requisiteCounts.map((g) => [g.supplierId, g._count._all]));
    const entryCountById = new Map(entryCounts.map((g) => [g.supplierId, g._count._all]));

    return {
      data: suppliers.map((supplier) => {
        const stats = sumsById.get(supplier.id);
        const amountSum = roundMoney(Number(stats?._sum.amount ?? 0));
        const paymentSum = roundMoney(Number(stats?._sum.payment ?? 0));
        const openingBalance =
          supplier.openingBalance != null ? Number(supplier.openingBalance) : 0;
        const deletedAt = supplier.deletedAt as Date;
        return {
          id: supplier.id,
          legalName: supplier.legalName,
          commercialName: supplier.commercialName,
          name: supplier.commercialName || supplier.legalName,
          inn: supplier.inn,
          requisiteCount: requisiteCountById.get(supplier.id) ?? 0,
          entriesCount: entryCountById.get(supplier.id) ?? 0,
          openingBalance: supplier.openingBalance != null ? roundMoney(openingBalance) : null,
          amountSum,
          paymentSum,
          balance: roundMoney(openingBalance + amountSum - paymentSum),
          deletedBy: userName(supplier.deletedBy),
          deletedAt: deletedAt.toISOString(),
          permanentDeleteAt: new Date(
            deletedAt.getTime() + SuppliersService.TRASH_RETENTION_MS,
          ).toISOString(),
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: SuppliersService.TRASH_RETENTION_DAYS,
    };
  }

  /** Число поставщиков в корзине (для бейджа кнопки). */
  async trashCount() {
    await this.purgeExpiredTrash();
    const count = await this.prisma.supplier.count({ where: { deletedAt: { not: null } } });
    return { count };
  }

  /** Безвозвратно удаляет поставщиков из корзины старше 30 дней — вместе с
   *  ведомостью и реквизитами (каскад). Вызывается при обращении к корзине. */
  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - SuppliersService.TRASH_RETENTION_MS);
    const expired = await this.prisma.supplier.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true },
    });
    if (expired.length === 0) return;
    await this.prisma.supplier.deleteMany({
      where: { id: { in: expired.map((row) => row.id) } },
    });
  }

  private async assertInnFree(inn?: string | null) {
    if (!inn) return;
    const existing = await this.prisma.supplier.findUnique({ where: { inn } });
    if (existing) {
      throw new ConflictException(`Поставщик с ИНН ${inn} уже существует`);
    }
  }

  // ---------- Банковские реквизиты ----------

  async createRequisite(supplierId: string, dto: SaveSupplierRequisiteDto) {
    await this.assertSupplierExists(supplierId);
    if (dto.isDefault) {
      await this.prisma.supplierRequisite.updateMany({
        where: { supplierId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const last = await this.prisma.supplierRequisite.findFirst({
      where: { supplierId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const requisite = await this.prisma.supplierRequisite.create({
      data: {
        supplierId,
        name: dto.name.trim(),
        bankName: dto.bankName?.trim() || null,
        bankAccount: dto.bankAccount?.trim() || null,
        bankBik: dto.bankBik?.trim() || null,
        corrAccount: dto.corrAccount?.trim() || null,
        inn: dto.inn?.trim() || null,
        kpp: dto.kpp?.trim() || null,
        note: dto.note?.trim() || null,
        isDefault: dto.isDefault ?? false,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
    return serializeRequisite(requisite);
  }

  async updateRequisite(requisiteId: string, dto: SaveSupplierRequisiteDto) {
    const existing = await this.prisma.supplierRequisite.findUnique({ where: { id: requisiteId } });
    if (!existing) throw new NotFoundException('Блок реквизитов не найден');
    if (dto.isDefault) {
      await this.prisma.supplierRequisite.updateMany({
        where: { supplierId: existing.supplierId, isDefault: true, id: { not: requisiteId } },
        data: { isDefault: false },
      });
    }
    const requisite = await this.prisma.supplierRequisite.update({
      where: { id: requisiteId },
      data: {
        name: dto.name.trim(),
        bankName: dto.bankName?.trim() || null,
        bankAccount: dto.bankAccount?.trim() || null,
        bankBik: dto.bankBik?.trim() || null,
        corrAccount: dto.corrAccount?.trim() || null,
        inn: dto.inn?.trim() || null,
        kpp: dto.kpp?.trim() || null,
        note: dto.note?.trim() || null,
        isDefault: dto.isDefault ?? false,
      },
    });
    return serializeRequisite(requisite);
  }

  async deleteRequisite(requisiteId: string) {
    const existing = await this.prisma.supplierRequisite.findUnique({ where: { id: requisiteId } });
    if (!existing) throw new NotFoundException('Блок реквизитов не найден');
    await this.prisma.supplierRequisite.delete({ where: { id: requisiteId } });
    return { deleted: true };
  }

  private async assertSupplierExists(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { deletedAt: true },
    });
    if (!supplier || supplier.deletedAt) throw new NotFoundException('Поставщик не найден');
  }
}

/** Наименование поставщика после trim должно оставаться осмысленным. */
function assertLegalName(legalName: string | undefined) {
  if (!legalName || legalName.trim().length < 2) {
    throw new BadRequestException('Наименование юридическое — минимум 2 символа');
  }
}

/** Необязательные текстовые поля: пустая строка → null (чтобы не плодить '' в уникальном ИНН). */
function normalizeOptionalText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSupplierFields(
  dto: Omit<SaveSupplierDto, 'openingBalance' | 'openingBalanceDate'>,
) {
  return {
    legalName: dto.legalName?.trim(),
    commercialName: normalizeOptionalText(dto.commercialName),
    inn: normalizeOptionalText(dto.inn),
    legalAddress: normalizeOptionalText(dto.legalAddress),
    website: normalizeOptionalText(dto.website),
    email: normalizeOptionalText(dto.email),
    phone: dto.phone?.map((p) => p.trim()).filter((p) => p.length > 0),
    isActive: dto.isActive,
  };
}
