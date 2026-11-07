import { Injectable, Logger } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { AdminNotificationSettingsReaderService } from '../../bell-push/admin-notification-settings-reader.service';
import { PrismaService } from '../../database/prisma.service';

/** Данные созданной ведомости авансов монтажника для уведомлений (колокольчик + push). */
export type InstallerAdvanceSheetNotifyData = {
  id: string;
  number: number;
  installerName: string;
  /** Сумма всех строк ведомости. */
  totalAmount: number;
  /** Количество строк в ведомости (авансы по договорам и выдачи без договора). */
  itemCount: number;
  /** Строки добавлены в уже созданную сегодня ведомость (автообъединение за день). */
  appendedToExisting?: boolean;
};

/**
 * Уведомления о создании новой ведомости авансов монтажника
 * (/admin/installer-advance-sheets). Получатели — все сотрудники админки
 * с включённым чекбоксом «Ведомости авансов монтажников», кроме создателя.
 */
@Injectable()
export class InstallerAdvanceSheetNotifyService {
  private readonly logger = new Logger(InstallerAdvanceSheetNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly settingsReader: AdminNotificationSettingsReaderService,
  ) {}

  onCreated(sheet: InstallerAdvanceSheetNotifyData, actorUserId?: string): void {
    void this.notify(sheet, actorUserId).catch((error) => {
      this.logger.warn(
        `Ведомость авансов: не удалось отправить уведомление — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private buildMessage(sheet: InstallerAdvanceSheetNotifyData): string {
    const amount = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(
      sheet.totalAmount,
    );
    // Строки бывают не только по договорам, поэтому считаем «позициями».
    const mod10 = sheet.itemCount % 10;
    const mod100 = sheet.itemCount % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? 'позиция'
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? 'позиции'
          : 'позиций';
    return `${sheet.itemCount} ${word} · ${amount} ₽ · ${sheet.installerName}`;
  }

  private async notify(
    sheet: InstallerAdvanceSheetNotifyData,
    actorUserId?: string,
  ): Promise<void> {
    const recipients = (
      await this.settingsReader.getUserIdsWithEventEnabled('notifyOnInstallerAdvanceSheets')
    ).filter((id) => id !== actorUserId);
    if (recipients.length === 0) return;

    const title = sheet.appendedToExisting
      ? `Ведомость авансов №${sheet.number} пополнена`
      : `Ведомость авансов №${sheet.number} создана`;
    const message = this.buildMessage(sheet);
    const href = `/admin/installer-advance-sheets/${sheet.id}`;

    await this.prisma.installerAdvanceSheetBellEvent.createMany({
      data: recipients.map((recipientId) => ({
        recipientId,
        sheetId: sheet.id,
        title,
        message,
        href,
      })),
    });

    await Promise.all(
      recipients.map((recipientId) =>
        this.adminBellPush.notifyUsers([recipientId], 'installer_advance_sheet', {
          title,
          body: message,
          url: href,
          tag: `installer-advance-sheet-${sheet.id}-${recipientId}`,
        }),
      ),
    );
  }
}
