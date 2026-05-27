import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateContractDocumentPaymentInvoiceDto } from './dto/create-contract-document-payment-invoice.dto';

const COUNTER_ID = 'global';
const MAX_INVOICES_PER_PACKAGE = 200;

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
  constructor(private readonly prisma: PrismaService) {}

  private serialize(
    row: Prisma.ContractDocumentPaymentInvoiceGetPayload<{
      include: {
        issuedBy: { select: { id: true; email: true; firstName: true; lastName: true } };
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
      package: {
        select: { id: true, title: true, kind: true, formData: true },
      },
    } as const;
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
      where: { packageId },
      include: this.includePackage(),
      orderBy: [{ invoiceDate: 'desc' }, { sequenceNumber: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async listAll(query?: { search?: string; packageId?: string; limit?: number }) {
    const limit = Math.min(Math.max(query?.limit ?? 500, 1), 2000);
    const search = query?.search?.trim().toLowerCase();
    const packageId = query?.packageId?.trim();

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
        package: { deletedAt: null },
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
}
