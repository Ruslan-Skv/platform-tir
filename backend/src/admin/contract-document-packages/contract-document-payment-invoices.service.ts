import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentType, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import {
  invoiceContractorStampLines,
  isPdfBuffer,
  stampPdfLastPage,
  uploadsFileUrl,
} from '../../contract-document-signing/finalize/signing-pdf';
import {
  managerDisplayName,
  resolveContractorInfo,
} from '../../contract-document-signing/signing-contractor-info';
import { signingSiteUrl } from '../../contract-document-signing/signing-session-dto';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractDocumentPaymentInvoiceDto } from './dto/create-contract-document-payment-invoice.dto';

const COUNTER_ID = 'global';
const MAX_INVOICES_PER_PACKAGE = 200;

/** Срок хранения удалённых счетов в корзине (по аналогии с корзиной журнала ДП). */
const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

type LegacyIssuedInvoice = {
  id?: string;
  number?: string;
  date?: string;
  amountRub?: number;
  basis?: string;
  paymentType?: string;
  addendumNumber?: number;
};

function parseInvoiceDigits(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function contractNumberFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const contract = (formData as Record<string, unknown>).contract;
  if (!contract || typeof contract !== 'object') return '';
  const num = (contract as Record<string, unknown>).number;
  return typeof num === 'string' ? num.trim() : '';
}

type StoredPaymentInvoiceLineItem = {
  lineKind: 'GOODS' | 'SERVICE';
  name: string;
  quantity: string;
  unit: string;
  vatLabel: string;
  unitPrice: number;
  amount: number;
};

function normalizeStoredLineKind(raw: unknown): 'GOODS' | 'SERVICE' {
  return raw === 'GOODS' ? 'GOODS' : 'SERVICE';
}

function normalizeLineItemsForStorage(
  raw: CreateContractDocumentPaymentInvoiceDto['lineItems'],
): StoredPaymentInvoiceLineItem[] {
  if (!raw?.length) return [];
  return raw.map((item) => ({
    lineKind: normalizeStoredLineKind(item.lineKind),
    name: item.name.trim(),
    quantity: (item.quantity ?? '1').trim() || '1',
    unit: (item.unit ?? 'шт.').trim() || 'шт.',
    vatLabel: (item.vatLabel ?? 'Без НДС').trim() || 'Без НДС',
    unitPrice: item.unitPrice,
    amount: item.amount,
  }));
}

function parseStoredLineItems(value: unknown): StoredPaymentInvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      lineKind: normalizeStoredLineKind(row.lineKind),
      name: typeof row.name === 'string' ? row.name : '',
      quantity: typeof row.quantity === 'string' ? row.quantity : '1',
      unit: typeof row.unit === 'string' ? row.unit : 'шт.',
      vatLabel: typeof row.vatLabel === 'string' ? row.vatLabel : 'Без НДС',
      unitPrice: Number(row.unitPrice) || 0,
      amount: Number(row.amount) || 0,
    }))
    .filter((row) => row.name.trim() && row.amount > 0);
}

function customerNameFromFormData(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const customer = (formData as Record<string, unknown>).customer;
  if (!customer || typeof customer !== 'object') return '';
  const fullName = (customer as Record<string, unknown>).fullName;
  return typeof fullName === 'string' ? fullName.trim() : '';
}

@Injectable()
export class ContractDocumentPaymentInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private serialize(
    row: Prisma.ContractDocumentPaymentInvoiceGetPayload<{
      include: {
        issuedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
        signedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
        deletedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
        package: { select: { id: true; title: true; kind: true; formData: true } };
      };
    }>,
  ) {
    return {
      id: row.id,
      packageId: row.packageId,
      sequenceNumber: row.sequenceNumber,
      invoiceNumber: String(row.sequenceNumber),
      invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
      amount: row.amount.toString(),
      paymentType: row.paymentType,
      addendumNumber: row.addendumNumber,
      basis: row.basis,
      lineItems: parseStoredLineItems(row.lineItems),
      legacyFormId: row.legacyFormId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      issuedById: row.issuedById,
      issuedBy: row.issuedBy
        ? {
            id: row.issuedBy.id,
            email: row.issuedBy.email,
            firstName: row.issuedBy.firstName,
            lastName: row.issuedBy.lastName,
          }
        : null,
      signedAt: row.signedAt ? row.signedAt.toISOString() : null,
      signedById: row.signedById,
      signedBy: row.signedBy
        ? {
            id: row.signedBy.id,
            email: row.signedBy.email,
            firstName: row.signedBy.firstName,
            lastName: row.signedBy.lastName,
          }
        : null,
      signedFileUrl: row.signedFileUrl,
      signedSha256: row.signedSha256,
      packageTitle: row.package.title,
      packageKind: row.package.kind,
      contractNumber: contractNumberFromFormData(row.package.formData),
      customerName: customerNameFromFormData(row.package.formData),
    };
  }

  private includePackage() {
    return {
      issuedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      signedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      deletedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      package: {
        select: { id: true, title: true, kind: true, formData: true },
      },
    } as const;
  }

  /** Строка корзины: обычная сериализация + кто/когда удалил и момент безвозвратного удаления. */
  private serializeTrash(
    row: Prisma.ContractDocumentPaymentInvoiceGetPayload<{
      include: {
        issuedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
        signedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
        deletedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
        package: { select: { id: true; title: true; kind: true; formData: true } };
      };
    }>,
  ) {
    return {
      ...this.serialize(row),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      deletedById: row.deletedById,
      deletedBy: row.deletedBy
        ? {
            id: row.deletedBy.id,
            email: row.deletedBy.email,
            firstName: row.deletedBy.firstName,
            lastName: row.deletedBy.lastName,
          }
        : null,
      /** Момент безвозвратного удаления — deletedAt + срок хранения корзины (30 дней). */
      permanentDeleteAt: row.deletedAt
        ? new Date(row.deletedAt.getTime() + TRASH_RETENTION_MS).toISOString()
        : null,
    };
  }

  private async assertPackageExists(packageId: string) {
    const row = await this.prisma.contractDocumentPackage.findUnique({
      where: { id: packageId },
      select: { id: true, deletedAt: true },
    });
    if (!row || row.deletedAt) {
      throw new NotFoundException('Пакет документов не найден');
    }
  }

  private async allocateSequenceNumber(tx: Prisma.TransactionClient): Promise<number> {
    const updated = await tx.contractDocumentPaymentInvoiceCounter.update({
      where: { id: COUNTER_ID },
      data: { value: { increment: 1 } },
    });
    return updated.value;
  }

  private async seedCounterFromExisting(tx: Prisma.TransactionClient): Promise<void> {
    const counter = await tx.contractDocumentPaymentInvoiceCounter.findUnique({
      where: { id: COUNTER_ID },
    });
    if (!counter || counter.value > 0) return;

    const maxRow = await tx.contractDocumentPaymentInvoice.findFirst({
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    let max = maxRow?.sequenceNumber ?? 0;

    const packages = await tx.contractDocumentPackage.findMany({
      where: { deletedAt: null },
      select: { formData: true },
    });
    for (const pkg of packages) {
      const fd = pkg.formData as Record<string, unknown> | null;
      const list = fd?.issuedInvoices;
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const n = parseInvoiceDigits(String((item as LegacyIssuedInvoice).number ?? ''));
        if (n != null) max = Math.max(max, n);
      }
    }

    if (max > 0) {
      await tx.contractDocumentPaymentInvoiceCounter.update({
        where: { id: COUNTER_ID },
        data: { value: max },
      });
    }
  }

  async peekNextInvoiceNumber(): Promise<{ nextNumber: string; nextSequence: number }> {
    return this.prisma.$transaction(async (tx) => {
      await this.seedCounterFromExisting(tx);
      const counter = await tx.contractDocumentPaymentInvoiceCounter.findUnique({
        where: { id: COUNTER_ID },
      });
      const nextSequence = (counter?.value ?? 0) + 1;
      return { nextNumber: String(nextSequence), nextSequence };
    });
  }

  private async migrateLegacyForPackage(
    tx: Prisma.TransactionClient,
    packageId: string,
    formData: unknown,
  ): Promise<void> {
    if (!formData || typeof formData !== 'object') return;
    const list = (formData as Record<string, unknown>).issuedInvoices;
    if (!Array.isArray(list) || list.length === 0) return;

    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as LegacyIssuedInvoice;
      const legacyId = typeof item.id === 'string' ? item.id.trim() : '';
      if (!legacyId) continue;

      const exists = await tx.contractDocumentPaymentInvoice.findFirst({
        where: { packageId, legacyFormId: legacyId },
        select: { id: true },
      });
      if (exists) continue;

      const basis = typeof item.basis === 'string' ? item.basis.trim() : '';
      const date = typeof item.date === 'string' ? item.date.trim() : '';
      const amountRub = Number(item.amountRub);
      if (!basis || !date || !Number.isFinite(amountRub) || amountRub <= 0) continue;

      let paymentType: PaymentType = PaymentType.ADVANCE;
      if (item.paymentType === 'PREPAYMENT') paymentType = PaymentType.PREPAYMENT;
      else if (item.paymentType === 'FINAL') paymentType = PaymentType.FINAL;
      else if (item.paymentType === 'AMENDMENT') paymentType = PaymentType.AMENDMENT;

      let addendumNumber: number | null = null;
      if (paymentType === PaymentType.AMENDMENT) {
        const n = Number(item.addendumNumber);
        if (Number.isFinite(n) && n >= 1 && n <= 5) addendumNumber = n;
        else continue;
      }

      const parsedSeq = parseInvoiceDigits(item.number);
      let sequenceNumber: number;
      if (parsedSeq != null) {
        sequenceNumber = parsedSeq;
        const taken = await tx.contractDocumentPaymentInvoice.findUnique({
          where: { sequenceNumber },
          select: { id: true },
        });
        if (taken) {
          sequenceNumber = await this.allocateSequenceNumber(tx);
        } else {
          const counter = await tx.contractDocumentPaymentInvoiceCounter.findUnique({
            where: { id: COUNTER_ID },
          });
          if ((counter?.value ?? 0) < sequenceNumber) {
            await tx.contractDocumentPaymentInvoiceCounter.update({
              where: { id: COUNTER_ID },
              data: { value: sequenceNumber },
            });
          }
        }
      } else {
        await this.seedCounterFromExisting(tx);
        sequenceNumber = await this.allocateSequenceNumber(tx);
      }

      await tx.contractDocumentPaymentInvoice.create({
        data: {
          packageId,
          sequenceNumber,
          invoiceDate: new Date(date),
          amount: amountRub,
          paymentType,
          addendumNumber,
          basis,
          legacyFormId: legacyId,
        },
      });
    }
  }

  private async ensureLegacyMigrated(packageId: string): Promise<void> {
    const pkg = await this.prisma.contractDocumentPackage.findUnique({
      where: { id: packageId },
      select: { formData: true },
    });
    if (!pkg) return;
    await this.prisma.$transaction(async (tx) => {
      await this.seedCounterFromExisting(tx);
      await this.migrateLegacyForPackage(tx, packageId, pkg.formData);
    });
  }

  async listForPackage(packageId: string) {
    await this.assertPackageExists(packageId);
    await this.ensureLegacyMigrated(packageId);
    const rows = await this.prisma.contractDocumentPaymentInvoice.findMany({
      where: { packageId, deletedAt: null },
      include: this.includePackage(),
      orderBy: [{ invoiceDate: 'desc' }, { sequenceNumber: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async listAll(query?: {
    search?: string;
    packageId?: string;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const limit = Math.min(Math.max(query?.limit ?? 500, 1), 2000);
    const search = query?.search?.trim().toLowerCase();
    const packageId = query?.packageId?.trim();
    // Период по дате счёта (границы дня включительно).
    const dateFrom = query?.dateFrom?.trim();
    const dateTo = query?.dateTo?.trim();
    const invoiceDateFilter =
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
          }
        : undefined;

    const repairPackages = await this.prisma.contractDocumentPackage.findMany({
      where: { kind: 'REPAIR', deletedAt: null },
      select: { id: true, formData: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await this.seedCounterFromExisting(tx);
      for (const pkg of repairPackages) {
        await this.migrateLegacyForPackage(tx, pkg.id, pkg.formData);
      }
    });

    const rows = await this.prisma.contractDocumentPaymentInvoice.findMany({
      where: {
        ...(packageId ? { packageId } : {}),
        deletedAt: null,
        package: { deletedAt: null },
        ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
      },
      include: this.includePackage(),
      orderBy: [{ invoiceDate: 'desc' }, { sequenceNumber: 'desc' }],
      take: limit,
    });

    let items = rows.map((r) => this.serialize(r));
    if (search) {
      items = items.filter((row) => {
        const haystack = [
          row.invoiceNumber,
          row.contractNumber,
          row.customerName,
          row.basis,
          row.packageTitle ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }
    return { items, total: items.length };
  }

  async create(
    packageId: string,
    dto: CreateContractDocumentPaymentInvoiceDto,
    issuedById?: string,
  ) {
    await this.assertPackageExists(packageId);
    const count = await this.prisma.contractDocumentPaymentInvoice.count({
      where: { packageId },
    });
    if (count >= MAX_INVOICES_PER_PACKAGE) {
      throw new BadRequestException(
        `По одному договору допускается не более ${MAX_INVOICES_PER_PACKAGE} счетов`,
      );
    }

    const paymentType = dto.paymentType as unknown as PaymentType;
    let addendumNumber: number | null = dto.addendumNumber ?? null;
    if (paymentType === PaymentType.AMENDMENT) {
      if (addendumNumber == null || addendumNumber < 1 || addendumNumber > 5) {
        throw new BadRequestException('Для счёта по Д/с укажите номер от 1 до 5');
      }
    } else {
      addendumNumber = null;
    }

    const lineItems = normalizeLineItemsForStorage(dto.lineItems);
    if (lineItems.length === 0) {
      throw new BadRequestException('Добавьте хотя бы одну позицию в таблицу счёта');
    }
    const linesTotal = lineItems.reduce((sum, line) => sum + line.amount, 0);
    if (Math.abs(linesTotal - dto.amount) > 0.02) {
      throw new BadRequestException('Сумма счёта должна совпадать с итогом по позициям');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await this.seedCounterFromExisting(tx);
      const sequenceNumber = await this.allocateSequenceNumber(tx);
      return tx.contractDocumentPaymentInvoice.create({
        data: {
          packageId,
          sequenceNumber,
          invoiceDate: new Date(dto.invoiceDate),
          amount: dto.amount,
          paymentType,
          addendumNumber,
          basis: dto.basis.trim(),
          lineItems: lineItems as unknown as Prisma.InputJsonValue,
          issuedById: issuedById ?? null,
        },
        include: this.includePackage(),
      });
    });

    return this.serialize(created);
  }

  /**
   * Подписывает выставленный счёт ПЭП со стороны Подрядчика (Заказчик счёт не
   * подписывает). На переданный из редактора PDF ставится штамп ПЭП (аналогично
   * штампу на документах из сессий подписания), подписанная копия сохраняется
   * в uploads, её SHA-256 фиксируется в записи счёта.
   */
  async signWithEp(
    packageId: string,
    invoiceId: string,
    file: Express.Multer.File,
    input: { contractorLabel?: string | null; contractorSignatory?: string | null },
    signedById?: string,
  ) {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: { kind: true },
    });
    if (!pkg) {
      throw new NotFoundException('Пакет документов не найден');
    }
    const invoice = await this.prisma.contractDocumentPaymentInvoice.findFirst({
      where: { id: invoiceId, packageId, deletedAt: null },
      select: { id: true, sequenceNumber: true, invoiceDate: true, signedAt: true },
    });
    if (!invoice) {
      throw new NotFoundException('Счёт не найден');
    }
    if (invoice.signedAt) {
      throw new BadRequestException('Счёт уже подписан ЭП');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл счёта не загружен');
    }
    if (!isPdfBuffer(file.buffer)) {
      throw new BadRequestException('Файл счёта должен быть PDF');
    }

    const contractor = await resolveContractorInfo(this.prisma, pkg.kind, {
      contractorLabel: input.contractorLabel,
      contractorSignatory: input.contractorSignatory,
    });
    const managerName = await managerDisplayName(this.prisma, signedById ?? null);
    const signedAt = new Date();

    const stamped = await stampPdfLastPage(
      file.buffer,
      invoiceContractorStampLines({
        invoiceNumber: String(invoice.sequenceNumber),
        invoiceDate: invoice.invoiceDate,
        contractorLabel: contractor.contractorLabel,
        contractorSignatory: contractor.contractorSignatory,
        managerName,
        signedAt,
        siteUrl: signingSiteUrl(this.config),
      }),
    );

    const dir = path.join(
      process.cwd(),
      'uploads',
      'contract-document-packages',
      'payment-invoices',
      invoice.id,
    );
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `schet_${invoice.sequenceNumber}_pep_${Date.now()}.pdf`;
    const fullPath = path.join(dir, fileName);
    fs.writeFileSync(fullPath, stamped);

    const updated = await this.prisma.contractDocumentPaymentInvoice.update({
      where: { id: invoice.id },
      data: {
        signedAt,
        signedById: signedById ?? null,
        signedFileUrl: uploadsFileUrl(fullPath),
        signedSha256: crypto.createHash('sha256').update(stamped).digest('hex'),
      },
      include: this.includePackage(),
    });
    return this.serialize(updated);
  }

  /** Отмена ПЭП счёта: подписанная копия удаляется, отметка подписания снимается. */
  async cancelEp(packageId: string, invoiceId: string) {
    const invoice = await this.prisma.contractDocumentPaymentInvoice.findFirst({
      where: { id: invoiceId, packageId, deletedAt: null, package: { deletedAt: null } },
      select: { id: true, signedAt: true, signedFileUrl: true },
    });
    if (!invoice) {
      throw new NotFoundException('Счёт не найден');
    }
    if (!invoice.signedAt) {
      throw new BadRequestException('Счёт не подписан ЭП');
    }
    if (invoice.signedFileUrl) {
      try {
        fs.unlinkSync(path.join(process.cwd(), invoice.signedFileUrl.replace(/^\/+/, '')));
      } catch {
        // Файл уже удалён — просто снимаем отметку подписания.
      }
    }
    const updated = await this.prisma.contractDocumentPaymentInvoice.update({
      where: { id: invoice.id },
      data: {
        signedAt: null,
        signedById: null,
        signedFileUrl: null,
        signedSha256: null,
      },
      include: this.includePackage(),
    });
    return this.serialize(updated);
  }

  /**
   * Удаление выставленного счёта в корзину (только супер-админ): запись скрывается
   * из списков, через 30 дней удаляется безвозвратно (вместе с подписанной копией ЭП).
   */
  async remove(packageId: string, invoiceId: string, deletedById?: string) {
    const invoice = await this.prisma.contractDocumentPaymentInvoice.findFirst({
      where: { id: invoiceId, packageId, deletedAt: null, package: { deletedAt: null } },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException('Счёт не найден');
    }
    const row = await this.prisma.contractDocumentPaymentInvoice.update({
      where: { id: invoice.id },
      data: { deletedAt: new Date(), deletedById: deletedById ?? null },
      include: this.includePackage(),
    });
    return this.serializeTrash(row);
  }

  /** Корзина счетов: удалённые супер-админом записи с полной информацией. */
  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 15, 1), 50);
    const search = params.search?.trim().toLowerCase();
    const rows = await this.prisma.contractDocumentPaymentInvoice.findMany({
      where: { deletedAt: { not: null }, package: { deletedAt: null } },
      include: this.includePackage(),
      orderBy: { deletedAt: 'desc' },
    });
    let items = rows.map((r) => this.serializeTrash(r));
    if (search) {
      items = items.filter((row) => {
        const haystack = [
          row.invoiceNumber,
          row.contractNumber,
          row.customerName,
          row.basis,
          row.packageTitle ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }
    const total = items.length;
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      trashRetentionDays: TRASH_RETENTION_DAYS,
    };
  }

  /** Число счетов в корзине (для бейджа кнопки корзины). */
  async trashCount() {
    await this.purgeExpiredTrash();
    const count = await this.prisma.contractDocumentPaymentInvoice.count({
      where: { deletedAt: { not: null } },
    });
    return { count };
  }

  /**
   * Безвозвратно удаляет счета, хранящиеся в корзине дольше 30 дней (вместе
   * с подписанными копиями ЭП). Вызывается при обращении к корзине и её
   * счётчику — корзина чистится без отдельного планировщика.
   */
  private async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
    const expired = await this.prisma.contractDocumentPaymentInvoice.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { signedFileUrl: true },
    });
    for (const row of expired) {
      if (!row.signedFileUrl) continue;
      try {
        fs.unlinkSync(path.join(process.cwd(), row.signedFileUrl.replace(/^\/+/, '')));
      } catch {
        // Подписанная копия уже удалена — убираем только запись.
      }
    }
    await this.prisma.contractDocumentPaymentInvoice.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
  }
}
