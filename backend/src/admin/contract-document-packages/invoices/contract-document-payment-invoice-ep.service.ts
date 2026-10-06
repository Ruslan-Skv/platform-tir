import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ContractDocumentPackageKind } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import {
  invoiceContractorStampLines,
  isPdfBuffer,
  stampPdfLastPage,
  uploadsFileUrl,
} from '../../../contract-document-signing/finalize/signing-pdf';
import {
  managerDisplayName,
  resolveContractorInfo,
} from '../../../contract-document-signing/signing-contractor-info';
import { signingSiteUrl } from '../../../contract-document-signing/signing-session-dto';
import { PrismaService } from '../../../database/prisma.service';
import {
  INVOICE_INCLUDE,
  TRASH_RETENTION_DAYS,
  TRASH_RETENTION_MS,
  serializeInvoice,
  serializeInvoiceTrash,
} from './contract-document-payment-invoice-serialize';

/** Реквизиты Подрядчика из снимка профиля исполнителя (свободный счёт без пакета). */
function contractorFromExecutorProfile(profile: unknown): {
  contractorLabel: string | null;
  contractorSignatory: string | null;
} {
  if (!profile || typeof profile !== 'object') {
    return { contractorLabel: null, contractorSignatory: null };
  }
  const p = profile as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const company = str(p.companyName);
  const inn = str(p.inn);
  const name = str(p.directorNameNominative);
  const basis = str(p.basis);
  return {
    contractorLabel:
      [company || null, inn ? `ИНН ${inn}` : null].filter(Boolean).join(', ') || null,
    contractorSignatory: [name || null, basis || null].filter(Boolean).join(', ') || null,
  };
}

/**
 * ЭП и корзина выставленных счетов: подписание счёта ПЭП со стороны Подрядчика,
 * отмена подписи, удаление в корзину и безвозвратная очистка корзины (30 дней).
 * Счета ищутся по id: у договорных проверяется пакет, свободные идут без него.
 */
@Injectable()
export class ContractDocumentPaymentInvoiceEpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Подписывает выставленный счёт ПЭП со стороны Подрядчика (Заказчик счёт
   * не подписывает). На переданный из редактора PDF ставится штамп ПЭП (аналогично
   * штампу на документах из сессий подписания), подписанная копия сохраняется
   * в uploads, её SHA-256 фиксируется в записи счёта.
   */
  async signWithEp(
    packageId: string | null,
    invoiceId: string,
    file: Express.Multer.File,
    input: { contractorLabel?: string | null; contractorSignatory?: string | null },
    signedById?: string,
  ) {
    // Свободный счёт (packageId null) подписывается реквизитами из снимка исполнителя.
    let packageKind: ContractDocumentPackageKind | null = null;
    if (packageId) {
      const pkg = await this.prisma.contractDocumentPackage.findFirst({
        where: { id: packageId, deletedAt: null },
        select: { kind: true },
      });
      if (!pkg) {
        throw new NotFoundException('Пакет документов не найден');
      }
      packageKind = pkg.kind;
    }
    const invoice = await this.prisma.contractDocumentPaymentInvoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: {
        id: true,
        sequenceNumber: true,
        invoiceDate: true,
        signedAt: true,
        executorProfile: true,
      },
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

    // Свободный счёт: явные значения из запроса, иначе — снимок исполнителя.
    const snapshot = contractorFromExecutorProfile(invoice.executorProfile);
    const contractor = packageKind
      ? await resolveContractorInfo(this.prisma, packageKind, {
          contractorLabel: input.contractorLabel,
          contractorSignatory: input.contractorSignatory,
        })
      : {
          contractorLabel: input.contractorLabel || snapshot.contractorLabel,
          contractorSignatory: input.contractorSignatory || snapshot.contractorSignatory,
        };
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
      include: INVOICE_INCLUDE,
    });
    return serializeInvoice(updated);
  }

  /** Отмена ПЭП счёта: подписанная копия удаляется, отметка подписания снимается. */
  async cancelEp(invoiceId: string) {
    const invoice = await this.prisma.contractDocumentPaymentInvoice.findFirst({
      where: {
        id: invoiceId,
        deletedAt: null,
        OR: [{ package: null }, { package: { deletedAt: null } }],
      },
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
        // Подписанная копия уже удалена — просто снимаем отметку подписания.
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
      include: INVOICE_INCLUDE,
    });
    return serializeInvoice(updated);
  }

  /**
   * Удаление выставленного счёта в корзину (только супер-админ): запись скрывается
   * из списков, через 30 дней удаляется безвозвратно (вместе с подписанной копией ЭП).
   */
  async remove(invoiceId: string, deletedById?: string) {
    const invoice = await this.prisma.contractDocumentPaymentInvoice.findFirst({
      where: {
        id: invoiceId,
        deletedAt: null,
        OR: [{ package: null }, { package: { deletedAt: null } }],
      },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException('Счёт не найден');
    }
    const row = await this.prisma.contractDocumentPaymentInvoice.update({
      where: { id: invoice.id },
      data: { deletedAt: new Date(), deletedById: deletedById ?? null },
      include: INVOICE_INCLUDE,
    });
    return serializeInvoiceTrash(row);
  }

  /** Корзина счетов: удалённые супер-админом записи с полной информацией. */
  async findTrash(params: { search?: string; page?: number; limit?: number }) {
    await this.purgeExpiredTrash();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 15, 1), 50);
    const search = params.search?.trim().toLowerCase();
    const rows = await this.prisma.contractDocumentPaymentInvoice.findMany({
      where: {
        deletedAt: { not: null },
        OR: [{ package: null }, { package: { deletedAt: null } }],
      },
      include: INVOICE_INCLUDE,
      orderBy: { deletedAt: 'desc' },
    });
    let items = rows.map((row) => serializeInvoiceTrash(row));
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
