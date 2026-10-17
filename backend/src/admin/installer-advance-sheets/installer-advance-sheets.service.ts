import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallerAdvanceSheetItemStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstallerAdvanceSheetNotifyService } from './installer-advance-sheet-notify.service';
import {
  computeInstallerAccrual,
  isProductLikeKind,
  normalizeProductMarkupPercent,
} from '../installer-settlements/installer-accrual';
import { CreateInstallerAdvanceSheetDto } from './dto/create-installer-advance-sheet.dto';
import { PayInstallerAdvanceSheetDto } from './dto/pay-installer-advance-sheet.dto';
import { UpdateInstallerAdvanceSheetDto } from './dto/update-installer-advance-sheet.dto';
import {
  DETAIL_INCLUDE,
  SHEET_INCLUDE,
  isoDate,
  round2,
  serializeDetail,
  serializeSummary,
} from './installer-advance-sheet.serializer';

/** До 10 договоров в ведомости — с запасом. */
const MAX_ITEMS_PER_SHEET = 50;

/** Как в ContractDocumentPackageInstallerAdvancesService — лимит журнала на договор. */
const MAX_ADVANCES_PER_PACKAGE = 300;

@Injectable()
export class InstallerAdvanceSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: InstallerAdvanceSheetNotifyService,
  ) {}

  async findAll(params?: {
    status?: 'PENDING' | 'QUESTION' | 'PAID';
    installerId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, installerId, dateFrom, dateTo, search, page = 1, limit = 50 } = params || {};
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (page - 1) * take;

    const where: Prisma.InstallerAdvanceSheetWhereInput = {
      ...(installerId ? { installerId } : {}),
      ...(status === 'PENDING'
        ? { items: { some: { status: InstallerAdvanceSheetItemStatus.PENDING } } }
        : {}),
      ...(status === 'QUESTION'
        ? { items: { some: { status: InstallerAdvanceSheetItemStatus.QUESTION } } }
        : {}),
      ...(status === 'PAID'
        ? { items: { every: { status: InstallerAdvanceSheetItemStatus.PAID } } }
        : {}),
    };

    // Период по дате создания ведомости; dateTo — включительно (+сутки).
    const createdAtFrom = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const createdAtTo = dateTo
      ? new Date(new Date(`${dateTo}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)
      : null;
    const createdAt: Prisma.DateTimeFilter | undefined =
      createdAtFrom || createdAtTo
        ? {
            ...(createdAtFrom ? { gte: createdAtFrom } : {}),
            ...(createdAtTo ? { lt: createdAtTo } : {}),
          }
        : undefined;
    if (createdAt) {
      where.AND = [{ createdAt }];
    }

    const q = search?.trim();
    if (q) {
      const number = Number.parseInt(q, 10);
      where.OR = [
        // Номер ведомости («42» или «Ведомость № 42»)
        ...(Number.isFinite(number) && String(number) === q.trim() ? [{ number }] : []),
        { installer: { fullName: { contains: q, mode: 'insensitive' } } },
        {
          items: {
            some: { package: { formData: { path: ['contract', 'number'], string_contains: q } } },
          },
        },
        {
          items: {
            some: {
              package: { formData: { path: ['customer', 'fullName'], string_contains: q } },
            },
          },
        },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.installerAdvanceSheet.findMany({
        where,
        include: SHEET_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.installerAdvanceSheet.count({ where }),
    ]);

    return {
      data: rows.map(serializeSummary),
      total,
      page,
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  async findOne(id: string) {
    const sheet = await this.prisma.installerAdvanceSheet.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!sheet) {
      throw new NotFoundException('Ведомость не найдена');
    }
    return serializeDetail(sheet);
  }

  /**
   * Остаток з/п мастера по договору для формы ведомости: «начислено» по
   * заказ-наряду (тот же расчёт, что в «Расчёте мастеров») минус выданные
   * авансы. null-остаток — мастер не назначен в заказ-наряде договора.
   */
  async getPackageInstallerBalance(packageId: string, installerId: string) {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
      select: { id: true, kind: true, formData: true },
    });
    if (!pkg) {
      throw new NotFoundException('Договор не найден');
    }

    const installer = await this.prisma.installerMaster.findUnique({
      where: { id: installerId },
      select: { id: true, grade: true },
    });
    if (!installer) {
      throw new BadRequestException('Мастер не найден в справочнике');
    }

    // Товарные направления: наценка заказ-наряда из настроек направления.
    let productMarkupPercent: number | undefined;
    if (isProductLikeKind(pkg.kind)) {
      const settings = await this.prisma.contractDocumentRepairSettings.findFirst({
        where: { kind: pkg.kind },
        select: { windowsWorkOrderMarkupPercent: true },
      });
      productMarkupPercent = normalizeProductMarkupPercent(
        settings?.windowsWorkOrderMarkupPercent ?? undefined,
      );
    }

    const accruedByInstaller = computeInstallerAccrual({
      kind: pkg.kind,
      formData: pkg.formData,
      ...(productMarkupPercent !== undefined ? { productMarkupPercent } : {}),
      installerGradeById: new Map([[installer.id, installer.grade]]),
    });
    const accrued = accruedByInstaller.get(installer.id) ?? null;

    const paidRows = await this.prisma.contractDocumentPackageInstallerAdvance.findMany({
      where: { packageId, installerId },
      select: { amount: true },
    });
    const paid = round2(paidRows.reduce((sum, row) => sum + row.amount.toNumber(), 0));
    const accruedTotal = accrued ? round2(accrued.total) : null;

    return {
      packageId,
      installerId,
      /** Есть назначения мастера в заказ-наряде; иначе остаток неизвестен. */
      hasAccruals: accrued !== null,
      /** «Начислено» по заказ-наряду (строки сметы × коэффициенты направления). */
      accrued: accruedTotal,
      lineCount: accrued?.lineCount ?? 0,
      /** Выдано авансов по этому договору этому мастеру. */
      paid,
      /** Остаток к выплате; отрицательный — переплата; null — нет заказ-наряда. */
      balance: accruedTotal === null ? null : round2(accruedTotal - paid),
    };
  }

  async create(dto: CreateInstallerAdvanceSheetDto, createdById?: string) {
    const installer = await this.prisma.installerMaster.findUnique({
      where: { id: dto.installerId.trim() },
      select: { id: true, fullName: true },
    });
    if (!installer) {
      throw new BadRequestException('Мастер не найден в справочнике');
    }
    if (dto.items.length > MAX_ITEMS_PER_SHEET) {
      throw new BadRequestException(
        `В ведомости допускается не более ${MAX_ITEMS_PER_SHEET} строк`,
      );
    }
    await this.assertPackagesValid(dto.items.map((item) => item.packageId));

    const created = await this.prisma.installerAdvanceSheet.create({
      data: {
        installerId: installer.id,
        note: dto.note?.trim() ? dto.note.trim() : null,
        createdById: createdById ?? null,
        items: {
          create: dto.items.map((item) => ({
            packageId: item.packageId,
            amount: item.amount,
          })),
        },
      },
      include: SHEET_INCLUDE,
    });

    this.notify.onCreated(
      {
        id: created.id,
        number: created.number,
        installerName: installer.fullName,
        totalAmount: round2(created.items.reduce((sum, item) => sum + item.amount.toNumber(), 0)),
        itemCount: created.items.length,
      },
      createdById,
    );

    return serializeSummary(created);
  }

  async update(id: string, dto: UpdateInstallerAdvanceSheetDto) {
    const sheet = await this.prisma.installerAdvanceSheet.findUnique({
      where: { id },
      select: {
        id: true,
        installerId: true,
        items: { select: { id: true, packageId: true, status: true } },
      },
    });
    if (!sheet) {
      throw new NotFoundException('Ведомость не найдена');
    }
    const hasPaid = sheet.items.some(
      (item) => item.status === InstallerAdvanceSheetItemStatus.PAID,
    );

    if (dto.installerId !== undefined && dto.installerId.trim() !== sheet.installerId) {
      if (hasPaid) {
        throw new BadRequestException(
          'Нельзя сменить мастера: в ведомости уже есть выданные строки',
        );
      }
      const installer = await this.prisma.installerMaster.findUnique({
        where: { id: dto.installerId.trim() },
        select: { id: true },
      });
      if (!installer) {
        throw new BadRequestException('Мастер не найден в справочнике');
      }
    }

    if (dto.items !== undefined) {
      if (dto.items.length > MAX_ITEMS_PER_SHEET) {
        throw new BadRequestException(
          `В ведомости допускается не более ${MAX_ITEMS_PER_SHEET} строк`,
        );
      }
      const paidPackageIds = new Set(
        sheet.items
          .filter((item) => item.status === InstallerAdvanceSheetItemStatus.PAID)
          .map((item) => item.packageId),
      );
      const overlap = dto.items.filter((item) => paidPackageIds.has(item.packageId));
      if (overlap.length > 0) {
        throw new BadRequestException(
          'Договор уже выплачен в этой ведомости — уберите дублирующую строку',
        );
      }
      await this.assertPackagesValid(dto.items.map((item) => item.packageId));

      // Строки заменяются целиком: выплаченные остаются, остальные пересоздаются
      // (комментарии удалённых строк убираются вместе с ними).
      await this.prisma.$transaction([
        this.prisma.installerAdvanceSheetItem.deleteMany({
          where: { sheetId: id, status: { not: InstallerAdvanceSheetItemStatus.PAID } },
        }),
        this.prisma.installerAdvanceSheet.update({
          where: { id },
          data: {
            items: {
              create: dto.items.map((item) => ({
                packageId: item.packageId,
                amount: item.amount,
              })),
            },
          },
        }),
      ]);
    }

    await this.prisma.installerAdvanceSheet.update({
      where: { id },
      data: {
        ...(dto.installerId !== undefined ? { installerId: dto.installerId.trim() } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() ? dto.note.trim() : null } : {}),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const sheet = await this.prisma.installerAdvanceSheet.findUnique({
      where: { id },
      select: { id: true, items: { select: { status: true } } },
    });
    if (!sheet) {
      throw new NotFoundException('Ведомость не найдена');
    }
    if (sheet.items.some((item) => item.status === InstallerAdvanceSheetItemStatus.PAID)) {
      throw new BadRequestException(
        'Нельзя удалить ведомость с выданными строками — сначала отмените выплаты',
      );
    }
    await this.prisma.installerAdvanceSheet.delete({ where: { id } });
    return { ok: true };
  }

  /** Выплатить одну строку: создаёт запись журнала авансов и замораживает строку. */
  async payItem(
    sheetId: string,
    itemId: string,
    dto: PayInstallerAdvanceSheetDto,
    paidById?: string,
  ) {
    const { sheet, item } = await this.loadSheetAndItem(sheetId, itemId);
    if (item.status === InstallerAdvanceSheetItemStatus.PAID) {
      throw new BadRequestException('Строка уже выплачена');
    }
    await this.payItemsTx(sheet, [item], dto, paidById);
    return this.findOne(sheetId);
  }

  /** Выплатить все оставшиеся строки ведомости одной датой и способом. */
  async payAll(sheetId: string, dto: PayInstallerAdvanceSheetDto, paidById?: string) {
    const sheet = await this.prisma.installerAdvanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        installer: { select: { id: true, fullName: true } },
        items: { where: { status: { not: InstallerAdvanceSheetItemStatus.PAID } } },
      },
    });
    if (!sheet) {
      throw new NotFoundException('Ведомость не найдена');
    }
    if (sheet.items.length === 0) {
      throw new BadRequestException('В ведомости не осталось невыданных строк');
    }
    await this.payItemsTx(sheet, sheet.items, dto, paidById);
    return this.findOne(sheetId);
  }

  /** Отменить выплату: удаляет запись из журнала авансов, строка снова ожидает. */
  async unpayItem(sheetId: string, itemId: string) {
    const { item } = await this.loadSheetAndItem(sheetId, itemId);
    if (item.status !== InstallerAdvanceSheetItemStatus.PAID) {
      throw new BadRequestException('Строка не выплачена');
    }
    await this.prisma.$transaction(async (tx) => {
      // Запись могла быть удалена вручную из журнала договора — тогда просто возвращаем строку.
      await tx.contractDocumentPackageInstallerAdvance.deleteMany({
        where: { sheetItemId: item.id },
      });
      await tx.installerAdvanceSheetItem.update({
        where: { id: item.id },
        data: {
          status: InstallerAdvanceSheetItemStatus.PENDING,
          paidAt: null,
          paymentMethod: null,
          paidById: null,
        },
      });
    });
    return this.findOne(sheetId);
  }

  /** Комментарий в переписке по строке; вопрос супер-админа открывает статус QUESTION. */
  async addComment(
    sheetId: string,
    itemId: string,
    body: string,
    author?: { id: string; role: string },
  ) {
    const { item } = await this.loadSheetAndItem(sheetId, itemId);
    await this.prisma.$transaction([
      this.prisma.installerAdvanceSheetItemComment.create({
        data: { itemId: item.id, authorId: author?.id ?? null, body: body.trim() },
      }),
      ...(author?.role === 'SUPER_ADMIN' && item.status === InstallerAdvanceSheetItemStatus.PENDING
        ? [
            this.prisma.installerAdvanceSheetItem.update({
              where: { id: item.id },
              data: { status: InstallerAdvanceSheetItemStatus.QUESTION },
            }),
          ]
        : []),
    ]);
    return this.findOne(sheetId);
  }

  /** Снять вопрос: строка снова ожидает выплаты. */
  async resolveQuestion(sheetId: string, itemId: string) {
    const { item } = await this.loadSheetAndItem(sheetId, itemId);
    if (item.status !== InstallerAdvanceSheetItemStatus.QUESTION) {
      throw new BadRequestException('По строке нет открытого вопроса');
    }
    await this.prisma.installerAdvanceSheetItem.update({
      where: { id: item.id },
      data: { status: InstallerAdvanceSheetItemStatus.PENDING },
    });
    return this.findOne(sheetId);
  }

  private async loadSheetAndItem(sheetId: string, itemId: string) {
    const sheet = await this.prisma.installerAdvanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        installer: { select: { id: true, fullName: true } },
        items: { where: { id: itemId } },
      },
    });
    if (!sheet) {
      throw new NotFoundException('Ведомость не найдена');
    }
    const item = sheet.items[0];
    if (!item) {
      throw new NotFoundException('Строка ведомости не найдена');
    }
    return { sheet, item };
  }

  /** Создание записей журнала авансов + перевод строк в PAID — одной транзакцией. */
  private async payItemsTx(
    sheet: { number: number; createdAt: Date; installer: { id: string; fullName: string } },
    items: Array<{ id: string; packageId: string; amount: Prisma.Decimal }>,
    dto: PayInstallerAdvanceSheetDto,
    paidById?: string,
  ) {
    const paidAt = new Date(dto.paidAt);
    const note = `Ведомость №${sheet.number} от ${isoDate(sheet.createdAt)}`;

    await this.prisma.$transaction(async (tx) => {
      // Лимит журнала на договор — как при ручной выдаче из модалки договора.
      const packageIds = [...new Set(items.map((item) => item.packageId))];
      const counts = await tx.contractDocumentPackageInstallerAdvance.groupBy({
        by: ['packageId'],
        where: { packageId: { in: packageIds } },
        _count: { id: true },
      });
      const countByPackage = new Map(counts.map((row) => [row.packageId, row._count.id]));
      const perPackage = new Map<string, number>();
      for (const item of items) {
        const already =
          (countByPackage.get(item.packageId) ?? 0) + (perPackage.get(item.packageId) ?? 0);
        if (already >= MAX_ADVANCES_PER_PACKAGE) {
          throw new BadRequestException(
            `По одному договору допускается не более ${MAX_ADVANCES_PER_PACKAGE} записей авансов`,
          );
        }
        perPackage.set(item.packageId, already + 1);

        await tx.contractDocumentPackageInstallerAdvance.create({
          data: {
            packageId: item.packageId,
            installerId: sheet.installer.id,
            installerName: sheet.installer.fullName,
            paidAt,
            amount: item.amount,
            paymentMethod: dto.paymentMethod ?? null,
            note,
            createdById: paidById ?? null,
            sheetItemId: item.id,
          },
        });
        await tx.installerAdvanceSheetItem.update({
          where: { id: item.id },
          data: {
            status: InstallerAdvanceSheetItemStatus.PAID,
            paidAt,
            paymentMethod: dto.paymentMethod ?? null,
            paidById: paidById ?? null,
          },
        });
      }
    });
  }

  private async assertPackagesValid(packageIds: string[]) {
    const ids = [...new Set(packageIds)];
    if (ids.length !== packageIds.length) {
      throw new BadRequestException('В ведомости не может быть двух строк по одному договору');
    }
    if (ids.length === 0) {
      throw new BadRequestException('Добавьте хотя бы одну строку с договором');
    }
    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true },
    });
    if (packages.length !== ids.length) {
      throw new BadRequestException('Один из договоров не найден или удалён');
    }
  }
}
