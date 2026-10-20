import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SaveSupplierLedgerEntryDto } from './dto/save-ledger-entry.dto';
import {
  LEDGER_ENTRY_INCLUDE,
  balanceStatus,
  parseDateOrThrow,
  roundMoney,
  serializeLedgerEntry,
} from './suppliers-serialize';

/** Кто внёс/изменил запись ведомости — для проверок ролей. */
export type LedgerActor = { id?: string; role?: string } | undefined;

/** Ведомость расчётов поставщика: счета (ведущие специалисты), оплаты
 *  (супер-админ), FIFO-погашение самых ранних счетов и разбивка счёта
 *  по заказам/договорам. Карточка поставщика — в SuppliersService. */
@Injectable()
export class SuppliersLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getLedger(supplierId: string, params: { search?: string; page?: number; limit?: number }) {
    await this.assertSupplierExists(supplierId);
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const search = params.search?.trim();
    // Пользователь часто набирает «№888» — номер договора хранится без «№».
    const contractSearch = search ? search.replace(/^№\s*/, '') : '';
    const contractMatchIds = contractSearch
      ? await this.findEntryIdsByContractNumber(supplierId, contractSearch)
      : [];

    const where: Prisma.SupplierLedgerEntryWhereInput = {
      supplierId,
      ...(search
        ? {
            OR: [
              { documentNo: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
              // Совпадение по номеру договора из разбивки счёта.
              ...(contractMatchIds.length > 0 ? [{ id: { in: contractMatchIds } }] : []),
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
    assertCanManagePayments(dto.payment, actor.role);
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
        assertCanManagePayments(nextPayment, actor.role);
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
        const nextAmount = updated.amount != null ? Number(updated.amount) : null;
        this.assertOrderLinksAllowed(nextAmount, dto.orderLinks);
        await this.assertOrderLinksValid(nextAmount, dto.orderLinks);
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
      assertCanManagePayments(Number(existing.payment), actor.role);
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

  /** Id записей, в разбивке которых есть договор с искомым номером —
   *  регистронезависимо; номер лежит в JSON пакета (contract.number и
   *  legacy-ключи), Prisma-фильтры по JSON регистрозависимы — поэтому raw SQL. */
  private async findEntryIdsByContractNumber(
    supplierId: string,
    contractSearch: string,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT e.id
      FROM supplier_ledger_entries e
      JOIN supplier_ledger_entry_order_links l ON l."entryId" = e.id
      JOIN contract_document_packages p ON p.id = l."packageId"
      WHERE e."supplierId" = ${supplierId}
        AND COALESCE(
          p."formData"->'contract'->>'number',
          p."formData"->>'contractNumber',
          p."formData"->>'dogovorNumber',
          ''
        ) ILIKE ${`%${contractSearch}%`}
    `;
    return rows.map((row) => row.id);
  }

  private async assertSupplierExists(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { deletedAt: true },
    });
    if (!supplier || supplier.deletedAt) throw new NotFoundException('Поставщик не найден');
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
}

/** Записи с оплатой (проведение платежей) — только супер-админ. */
function assertCanManagePayments(
  payment: number | null | undefined,
  role: string | undefined,
): void {
  if (payment != null && payment !== 0 && role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Проводить оплаты поставщикам может только супер-админ');
  }
}
