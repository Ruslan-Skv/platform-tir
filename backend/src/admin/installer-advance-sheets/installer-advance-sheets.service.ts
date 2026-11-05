import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ContractDocumentPackageKind,
  InstallerAdvanceSheetItemStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstallerAdvanceSheetNotifyService } from './installer-advance-sheet-notify.service';
import { InstallerAdvanceSheetPaymentsService } from './installer-advance-sheet-payments.service';
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
  round2,
  serializeDetail,
  serializeSummary,
} from './installer-advance-sheet.serializer';

/** До 10 договоров в ведомости — с запасом. */
const MAX_ITEMS_PER_SHEET = 50;

@Injectable()
export class InstallerAdvanceSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: InstallerAdvanceSheetNotifyService,
    private readonly payments: InstallerAdvanceSheetPaymentsService,
  ) {}

  async findAll(params?: {
    status?: 'PENDING' | 'QUESTION' | 'PAID';
    unpaid?: boolean;
    packageKind?: ContractDocumentPackageKind;
    installerId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      unpaid,
      packageKind,
      installerId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 50,
    } = params || {};
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

    // Условия по строкам нельзя выразить одним ключом items — собираем в AND.
    const andConditions: Prisma.InstallerAdvanceSheetWhereInput[] = [];
    if (createdAt) andConditions.push({ createdAt });
    if (unpaid) {
      andConditions.push({
        items: { some: { status: { not: InstallerAdvanceSheetItemStatus.PAID } } },
      });
    }
    if (packageKind) {
      andConditions.push({ items: { some: { package: { kind: packageKind } } } });
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
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

  /**
   * Создание ведомости. Если у мастера уже есть созданные сегодня невыплаченные
   * ведомости (мастеру часто выдают аванс сразу по нескольким договорам с разных
   * строк план-графика) — новые строки добавляются в самую раннюю из них, а
   * остальные вливаются туда же и удаляются: одна невыплаченная ведомость на
   * мастера в день. Выплаченные/частично выплаченные ведомости не трогаем.
   */
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

    const { sheet, mergedFrom, appendedToExisting } = await this.prisma.$transaction(async (tx) => {
      const candidates = await tx.installerAdvanceSheet.findMany({
        where: {
          installerId: installer.id,
          createdAt: this.todayBounds(),
          items: { every: { status: { not: InstallerAdvanceSheetItemStatus.PAID } } },
        },
        select: { id: true, number: true, note: true, items: { select: { packageId: true } } },
        orderBy: { createdAt: 'asc' },
      });

      if (candidates.length === 0) {
        const created = await tx.installerAdvanceSheet.create({
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
        return { sheet: created, mergedFrom: [] as number[], appendedToExisting: false as const };
      }

      const [target, ...rest] = candidates;

      // После объединения двух строк по одному договору в ведомости быть не может.
      const sheetNumberOfPackage = new Map<string, number>();
      for (const candidate of candidates) {
        for (const item of candidate.items) {
          sheetNumberOfPackage.set(item.packageId, candidate.number);
        }
      }
      const duplicate = dto.items.find((item) => sheetNumberOfPackage.has(item.packageId));
      if (duplicate) {
        throw new BadRequestException(
          `Договор уже добавлен в созданную сегодня ведомость № ${sheetNumberOfPackage.get(
            duplicate.packageId,
          )} — измените сумму в ней`,
        );
      }
      const totalItems =
        candidates.reduce((sum, candidate) => sum + candidate.items.length, 0) + dto.items.length;
      if (totalItems > MAX_ITEMS_PER_SHEET) {
        throw new BadRequestException(
          `В ведомости допускается не более ${MAX_ITEMS_PER_SHEET} строк`,
        );
      }

      // Строки остальных ведомостей переезжают в целевую вместе с перепиской;
      // колокольчики лишних ведомостей удаляются каскадом.
      if (rest.length > 0) {
        await tx.installerAdvanceSheetItem.updateMany({
          where: { sheetId: { in: rest.map((candidate) => candidate.id) } },
          data: { sheetId: target.id },
        });
        await tx.installerAdvanceSheet.deleteMany({
          where: { id: { in: rest.map((candidate) => candidate.id) } },
        });
      }

      const sheet = await tx.installerAdvanceSheet.update({
        where: { id: target.id },
        data: {
          items: {
            create: dto.items.map((item) => ({
              packageId: item.packageId,
              amount: item.amount,
            })),
          },
          // Примечание целевой ведомости не затираем — берём новое, только если его нет.
          ...(dto.note?.trim() && !target.note ? { note: dto.note.trim() } : {}),
        },
        include: SHEET_INCLUDE,
      });
      return {
        sheet,
        mergedFrom: rest.map((candidate) => candidate.number),
        appendedToExisting: true as const,
      };
    });

    this.notify.onCreated(
      {
        id: sheet.id,
        number: sheet.number,
        installerName: installer.fullName,
        totalAmount: round2(sheet.items.reduce((sum, item) => sum + item.amount.toNumber(), 0)),
        itemCount: sheet.items.length,
        ...(appendedToExisting ? { appendedToExisting } : {}),
      },
      createdById,
    );

    return {
      ...serializeSummary(sheet),
      ...(appendedToExisting || mergedFrom.length > 0 ? { appendedToExisting: true as const } : {}),
      ...(mergedFrom.length > 0 ? { mergedFrom } : {}),
    };
  }

  async update(
    id: string,
    dto: UpdateInstallerAdvanceSheetDto,
    actor?: { id?: string; role?: string },
  ) {
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
    const allPaid =
      sheet.items.length > 0 &&
      sheet.items.every((item) => item.status === InstallerAdvanceSheetItemStatus.PAID);

    // Выплаченная ведомость — «замороженный» документ: правит только супер-админ.
    if (allPaid && actor?.role !== 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Ведомость полностью выплачена — редактировать её может только супер-админ',
      );
    }

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

  /** Выплатить одну строку (супер-админ); журнал авансов ведёт payments-сервис. */
  async payItem(
    sheetId: string,
    itemId: string,
    dto: PayInstallerAdvanceSheetDto,
    paidById?: string,
  ) {
    await this.payments.payItem(sheetId, itemId, dto, paidById);
    return this.findOne(sheetId);
  }

  /** Выплатить все оставшиеся строки ведомости одной датой и способом. */
  async payAll(sheetId: string, dto: PayInstallerAdvanceSheetDto, paidById?: string) {
    await this.payments.payAll(sheetId, dto, paidById);
    return this.findOne(sheetId);
  }

  /** Отменить выплату: запись уйдёт из журнала авансов, строка снова ожидает. */
  async unpayItem(sheetId: string, itemId: string) {
    await this.payments.unpayItem(sheetId, itemId);
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

  /** Границы текущих суток по локальному времени сервера (как фильтр даты в списке). */
  private todayBounds(): { gte: Date; lt: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start, lt: end };
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
