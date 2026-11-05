import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallerAdvanceSheetItemStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PayInstallerAdvanceSheetDto } from './dto/pay-installer-advance-sheet.dto';
import { isoDate } from './installer-advance-sheet.serializer';

/** Как в ContractDocumentPackageInstallerAdvancesService — лимит журнала на договор. */
const MAX_ADVANCES_PER_PACKAGE = 300;

/**
 * Выплаты по ведомости авансов (отмечает супер-админ): построчная выдача,
 * выдача всей ведомости и отмена выплаты. Каждая отметка создаёт запись
 * журнала авансов договора (ContractDocumentPackageInstallerAdvance) — она же
 * видна в модалке «Заказ-наряды» договора и в разделе «Расчёт мастеров».
 */
@Injectable()
export class InstallerAdvanceSheetPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
