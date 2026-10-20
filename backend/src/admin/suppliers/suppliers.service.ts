import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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

/** Кто внёс/изменил запись ведомости — для проверок ролей. */
export type LedgerActor = { id?: string; role?: string } | undefined;

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

  async createEntry(supplierId: string, dto: SaveSupplierLedgerEntryDto, actor: LedgerActor = {}) {
    await this.assertSupplierExists(supplierId);
    this.assertEntryAmounts(dto);
    this.assertCanManagePayments(dto.payment, actor.role);
    this.assertOrderLinksAllowed(dto.amount, dto.orderLinks);
    await this.assertOrderLinksValid(dto.amount, dto.orderLinks);
    const requisiteId = dto.requisiteId
      ? await this.assertRequisiteBelongsToSupplier(supplierId, dto.requisiteId)
      : null;

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supplierLedgerEntry.create({
        data: {
          supplierId,
          requisiteId,
          date: parseDateOrThrow(dto.date, 'Дата записи'),
          documentNo: dto.documentNo?.trim() || null,
          amount: dto.amount ?? null,
          payment: dto.payment ?? null,
          note: dto.note?.trim() || null,
          vatRate: dto.vatRate ?? null,
          ...(actor.id ? { createdById: actor.id } : {}),
        },
      });
      await this.replaceOrderLinks(tx, created.id, dto.orderLinks);
      await this.recalculatePaidAllocations(supplierId, tx);
      return tx.supplierLedgerEntry.findUnique({
        where: { id: created.id },
        include: LEDGER_ENTRY_INCLUDE,
      });
    });
    if (!entry) throw new NotFoundException('Запись ведомости не найдена');
    return serializeLedgerEntry(entry);
  }

  async updateEntry(entryId: string, dto: SaveSupplierLedgerEntryDto, actor: LedgerActor = {}) {
    const entry = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.supplierLedgerEntry.findUnique({ where: { id: entryId } });
      if (!existing) throw new NotFoundException('Запись ведомости не найдена');

      const nextPayment =
        dto.payment !== undefined
          ? dto.payment
          : existing.payment
            ? Number(existing.payment)
            : null;
      const nextAmount =
        dto.amount !== undefined ? dto.amount : existing.amount ? Number(existing.amount) : null;
      this.assertEntryAmounts({ amount: nextAmount, payment: nextPayment });
      // Оплату (создание/изменение суммы) проводит только супер-админ; правка
      // реквизитов счёта специалистом оплату не трогает и разрешена.
      if (dto.payment !== undefined) {
        this.assertCanManagePayments(nextPayment, actor.role);
      }

      const updated = await tx.supplierLedgerEntry.update({
        where: { id: entryId },
        data: {
          date: dto.date ? parseDateOrThrow(dto.date, 'Дата записи') : undefined,
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
      });
      if (dto.orderLinks !== undefined) {
        this.assertOrderLinksAllowed(
          updated.amount != null ? Number(updated.amount) : null,
          dto.orderLinks,
        );
        await this.assertOrderLinksValid(
          updated.amount != null ? Number(updated.amount) : null,
          dto.orderLinks,
        );
        await this.replaceOrderLinks(tx, entryId, dto.orderLinks);
      }
      await this.recalculatePaidAllocations(existing.supplierId, tx);
      return tx.supplierLedgerEntry.findUnique({
        where: { id: entryId },
        include: LEDGER_ENTRY_INCLUDE,
      });
    });
    if (!entry) throw new NotFoundException('Запись ведомости не найдена');
    return serializeLedgerEntry(entry);
  }

  async deleteEntry(entryId: string, actor: LedgerActor = {}) {
    const existing = await this.prisma.supplierLedgerEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new NotFoundException('Запись ведомости не найдена');
    if (existing.payment != null && Number(existing.payment) !== 0) {
      assertCanManagePayments(actor.role);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.supplierLedgerEntry.delete({ where: { id: entryId } });
      await this.recalculatePaidAllocations(existing.supplierId, tx);
    });
    return { deleted: true };
  }

  /** Хотя бы одна из сумм (счёт/оплата) должна быть заполнена и отлична от нуля. */
  private assertEntryAmounts(dto: { amount?: number | null; payment?: number | null }) {
    const hasAmount = dto.amount != null && dto.amount !== 0;
    const hasPayment = dto.payment != null && dto.payment !== 0;
    if (!hasAmount && !hasPayment) {
      throw new BadRequestException('Заполните сумму счёта или оплату');
    }
  }

  /** Оплаты в ведомости проводит только супер-админ (счета — ведущие специалисты). */
  private assertCanManagePayments(payment: number | null | undefined, role?: string) {
    if (payment != null && payment !== 0) {
      assertCanManagePayments(role);
    }
  }

  /** Разбивка по заказам имеет смысл только у счёта (строки с суммой). */
  private assertOrderLinksAllowed(
    amount: number | null | undefined,
    links: SaveSupplierLedgerEntryDto['orderLinks'],
  ) {
    if (links && links.length > 0 && (amount == null || amount <= 0)) {
      throw new BadRequestException('Разбивку по заказам можно задать только у счёта (с суммой)');
    }
  }

  /** Сумма разбивки не превышает счёт; заказы существуют и не удалены. */
  private async assertOrderLinksValid(
    amount: number | null | undefined,
    links: SaveSupplierLedgerEntryDto['orderLinks'],
  ) {
    if (!links || links.length === 0) return;
    const ids = [...new Set(links.map((link) => link.packageId))];
    if (ids.length !== links.length) {
      throw new BadRequestException('Один и тот же заказ указан в разбивке дважды');
    }
    const sum = roundMoney(links.reduce((acc, link) => acc + link.amount, 0));
    if (amount != null && sum > roundMoney(amount) + 0.005) {
      throw new BadRequestException('Сумма разбивки по заказам превышает сумму счёта');
    }
    const packages = await this.prisma.contractDocumentPackage.count({
      where: { id: { in: ids }, deletedAt: null },
    });
    if (packages !== ids.length) {
      throw new BadRequestException('В разбивке есть несуществующий или удалённый заказ');
    }
  }

  /** Полная замена разбивки счёта по заказам (undefined — не трогать, [] — снять). */
  private async replaceOrderLinks(
    tx: Prisma.TransactionClient,
    entryId: string,
    links: SaveSupplierLedgerEntryDto['orderLinks'],
  ) {
    if (links === undefined) return;
    await tx.supplierLedgerEntryOrderLink.deleteMany({ where: { entryId } });
    if (links.length === 0) return;
    await tx.supplierLedgerEntryOrderLink.createMany({
      data: links.map((link) => ({
        entryId,
        packageId: link.packageId,
        amount: new Prisma.Decimal(link.amount),
      })),
    });
  }

  /** Оплаты гасят самые ранние неоплаченные счета поставщика (FIFO): пул всех
   *  оплат разносится по счетам в порядке даты/внесения, остаток пула — переплата.
   *  Пересчитывается целиком после каждого изменения ведомости. */
  private async recalculatePaidAllocations(supplierId: string, tx: Prisma.TransactionClient) {
    const entries = await tx.supplierLedgerEntry.findMany({
      where: { supplierId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, amount: true, payment: true, paidAmount: true },
    });
    let pool = roundMoney(entries.reduce((acc, entry) => acc + Number(entry.payment ?? 0), 0));
    for (const entry of entries) {
      const invoice = entry.amount != null ? Number(entry.amount) : null;
      const allocated =
        invoice != null && invoice > 0 ? roundMoney(Math.max(0, Math.min(pool, invoice))) : 0;
      pool = roundMoney(pool - allocated);
      if (Math.abs(Number(entry.paidAmount ?? 0) - allocated) > 0.004) {
        await tx.supplierLedgerEntry.update({
          where: { id: entry.id },
          data: { paidAmount: new Prisma.Decimal(allocated) },
        });
      }
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

/** Записи с оплатой (проведение платежей) — только супер-админ. */
function assertCanManagePayments(role: string | undefined) {
  if (role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Проводить оплаты поставщикам может только супер-админ');
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
