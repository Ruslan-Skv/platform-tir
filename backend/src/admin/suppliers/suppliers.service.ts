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
import { SaveSupplierLedgerEntryDto } from './dto/save-ledger-entry.dto';
import {
  LEDGER_ENTRY_INCLUDE,
  SUPPLIER_BALANCE_STATUS,
  balanceStatus,
  roundMoney,
  serializeLedgerEntry,
  serializeRequisite,
  serializeSupplier,
} from './suppliers-serialize';

/** Раздел «Поставщики»: реквизиты + ведомость расчётов (счета/оплаты) по каждому
 *  поставщику. Сальдо конечное = сальдо начальное + Σ счетов − Σ оплат. */
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

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

    const where: Prisma.SupplierWhereInput = search
      ? {
          OR: [
            { legalName: { contains: search, mode: 'insensitive' } },
            { commercialName: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { inn: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

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
    if (!supplier) throw new NotFoundException('Поставщик не найден');

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
    if (!existing) throw new NotFoundException('Поставщик не найден');
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

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Поставщик не найден');

    const productsCount = await this.prisma.productSupplier.count({ where: { supplierId: id } });
    if (productsCount > 0) {
      throw new ConflictException(
        `К поставщику привязано товаров: ${productsCount}. Сначала отвяжите их в каталоге.`,
      );
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertInnFree(inn?: string | null) {
    if (!inn) return;
    const existing = await this.prisma.supplier.findUnique({ where: { inn } });
    if (existing) {
      throw new ConflictException(`Поставщик с ИНН ${inn} уже существует`);
    }
  }

  // ---------- Ведомость (счета и оплаты) ----------

  async getLedger(supplierId: string, params: { search?: string; page?: number; limit?: number }) {
    await this.assertSupplierExists(supplierId);
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const search = params.search?.trim();

    const where: Prisma.SupplierLedgerEntryWhereInput = {
      supplierId,
      ...(search
        ? {
            OR: [
              { documentNo: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [entries, total, sums, supplier] = await Promise.all([
      this.prisma.supplierLedgerEntry.findMany({
        where,
        include: LEDGER_ENTRY_INCLUDE,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplierLedgerEntry.count({ where }),
      this.prisma.supplierLedgerEntry.aggregate({
        where: { supplierId },
        _sum: { amount: true, payment: true },
      }),
      this.prisma.supplier.findUnique({ where: { id: supplierId } }),
    ]);

    const amountSum = roundMoney(Number(sums._sum.amount ?? 0));
    const paymentSum = roundMoney(Number(sums._sum.payment ?? 0));
    const openingBalance = supplier?.openingBalance != null ? Number(supplier.openingBalance) : 0;
    const balance = roundMoney(openingBalance + amountSum - paymentSum);

    return {
      data: entries.map(serializeLedgerEntry),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      amountSum,
      paymentSum,
      openingBalance: supplier?.openingBalance != null ? roundMoney(openingBalance) : null,
      balance,
      status: balanceStatus(balance),
    };
  }

  async createEntry(supplierId: string, dto: SaveSupplierLedgerEntryDto, currentUserId?: string) {
    await this.assertSupplierExists(supplierId);
    this.assertEntryAmounts(dto);
    const data: Prisma.SupplierLedgerEntryCreateInput = {
      supplier: { connect: { id: supplierId } },
      date: parseDateOrThrow(dto.date, 'Дата записи'),
      documentNo: dto.documentNo?.trim() || null,
      amount: dto.amount ?? null,
      payment: dto.payment ?? null,
      note: dto.note?.trim() || null,
      vatRate: dto.vatRate ?? null,
      createdBy: currentUserId ? { connect: { id: currentUserId } } : undefined,
      ...(dto.requisiteId
        ? {
            requisite: {
              connect: {
                id: await this.assertRequisiteBelongsToSupplier(supplierId, dto.requisiteId),
              },
            },
          }
        : {}),
    };
    const entry = await this.prisma.supplierLedgerEntry.create({
      data,
      include: LEDGER_ENTRY_INCLUDE,
    });
    return serializeLedgerEntry(entry);
  }

  async updateEntry(entryId: string, dto: SaveSupplierLedgerEntryDto) {
    const existing = await this.prisma.supplierLedgerEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new NotFoundException('Запись ведомости не найдена');

    const merged = {
      date: dto.date ?? existing.date.toISOString().slice(0, 10),
      amount:
        dto.amount !== undefined
          ? dto.amount
          : existing.amount != null
            ? Number(existing.amount)
            : undefined,
      payment:
        dto.payment !== undefined
          ? dto.payment
          : existing.payment != null
            ? Number(existing.payment)
            : undefined,
    };
    this.assertEntryAmounts(merged);

    const entry = await this.prisma.supplierLedgerEntry.update({
      where: { id: entryId },
      data: {
        date: parseDateOrThrow(merged.date, 'Дата записи'),
        documentNo: dto.documentNo !== undefined ? dto.documentNo.trim() || null : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        payment: dto.payment !== undefined ? dto.payment : undefined,
        note: dto.note !== undefined ? dto.note.trim() || null : undefined,
        vatRate: dto.vatRate !== undefined ? dto.vatRate : undefined,
        requisiteId:
          dto.requisiteId !== undefined
            ? dto.requisiteId
              ? await this.assertRequisiteBelongsToSupplier(existing.supplierId, dto.requisiteId)
              : null
            : undefined,
      },
      include: LEDGER_ENTRY_INCLUDE,
    });
    return serializeLedgerEntry(entry);
  }

  async deleteEntry(entryId: string) {
    const existing = await this.prisma.supplierLedgerEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new NotFoundException('Запись ведомости не найдена');
    await this.prisma.supplierLedgerEntry.delete({ where: { id: entryId } });
    return { deleted: true };
  }

  /** Хотя бы одна из сумм (счёт/оплата) должна быть заполнена и отлична от нуля. */
  private assertEntryAmounts(dto: { amount?: number; payment?: number }) {
    const hasAmount = dto.amount != null && dto.amount !== 0;
    const hasPayment = dto.payment != null && dto.payment !== 0;
    if (!hasAmount && !hasPayment) {
      throw new BadRequestException('Заполните сумму счёта или оплату');
    }
  }

  private async assertSupplierExists(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('Поставщик не найден');
  }

  private async assertRequisiteBelongsToSupplier(supplierId: string, requisiteId: string) {
    const requisite = await this.prisma.supplierRequisite.findUnique({
      where: { id: requisiteId },
    });
    if (!requisite || requisite.supplierId !== supplierId) {
      throw new BadRequestException('Указанный блок реквизитов не принадлежит этому поставщику');
    }
    return requisiteId;
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
}

/** Наименование поставщика после trim должно оставаться осмысленным. */
function assertLegalName(legalName: string | undefined) {
  if (!legalName || legalName.trim().length < 2) {
    throw new BadRequestException('Наименование юридическое — минимум 2 символа');
  }
}

/** Дата приходит строкой «ГГГГ-ММ-ДД»; проверяем Round-trip, как в остатках кассы. */
function parseDateOrThrow(value: string, fieldLabel: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${fieldLabel}: указана несуществующая дата`);
  }
  return date;
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
