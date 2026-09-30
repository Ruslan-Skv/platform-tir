import { Injectable, Logger } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { AdminNotificationSettingsReaderService } from '../../bell-push/admin-notification-settings-reader.service';
import { DP_MANUAL_DIRECTION_OTHER } from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';

/** Шаг рубежей итоговых продаж — каждый 1 млн ₽. */
const MILESTONE_STEP = 1_000_000;

/**
 * Уведомления «Итоги продаж»: при пересечении итоговыми продажами текущего
 * месяца очередного миллиона (1 млн, 2 млн, …) — как плитка «Итого за период»
 * на /admin/dp. Проверка запускается после любого изменения журнала ДП.
 */
@Injectable()
export class SalesTotalsNotifyService {
  private readonly logger = new Logger(SalesTotalsNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly settingsReader: AdminNotificationSettingsReaderService,
  ) {}

  onSalesChanged(): void {
    void this.checkAndNotify().catch((error) => {
      this.logger.warn(
        `Итоги продаж: не удалось отправить уведомление — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  /** Итоговые продажи текущего месяца — «Итого за период» журнала ДП без «Прочего» и корзины. */
  private async currentMonthSalesTotal(): Promise<number> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const sum = await this.prisma.moneyMovement.aggregate({
      where: {
        deletedAt: null,
        paymentDate: { gte: from, lt: to },
        direction: { not: DP_MANUAL_DIRECTION_OTHER },
      },
      _sum: { amount: true },
    });
    return Number(sum._sum.amount ?? 0);
  }

  private async checkAndNotify(): Promise<void> {
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const total = await this.currentMonthSalesTotal();
    const millions = Math.floor(total / MILESTONE_STEP);

    const state = await this.prisma.salesTotalMilestoneState.upsert({
      where: { periodMonth },
      update: {},
      create: { periodMonth, lastNotifiedMillions: 0 },
    });

    if (millions <= state.lastNotifiedMillions) {
      // Итог опустился ниже рубежа (удаление или правка записи) — сдвигаем состояние
      // назад, чтобы повторное пересечение рубежа снова отправило уведомление.
      if (millions < state.lastNotifiedMillions) {
        await this.prisma.salesTotalMilestoneState.update({
          where: { periodMonth },
          data: { lastNotifiedMillions: millions },
        });
      }
      return;
    }

    const milestones: number[] = [];
    for (let m = state.lastNotifiedMillions + 1; m <= millions; m += 1) milestones.push(m);

    await this.notifyMilestones(periodMonth, milestones, total, now);
    await this.prisma.salesTotalMilestoneState.update({
      where: { periodMonth },
      data: { lastNotifiedMillions: millions },
    });
  }

  private formatAmount(value: number): string {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
  }

  private async notifyMilestones(
    periodMonth: string,
    milestones: number[],
    total: number,
    now: Date,
  ): Promise<void> {
    const recipients = await this.settingsReader.getUserIdsWithEventEnabled('notifyOnSalesTotals');
    if (recipients.length === 0) return;

    const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now);
    const href = '/admin/dp';

    for (const millions of milestones) {
      const title = `Итоги продаж — ${millions} млн ₽`;
      const message = `Продажи за ${monthLabel}: ${this.formatAmount(total)} ₽`;
      // Уникальный ключ (получатель, месяц, рубеж) защищает от дублей при гонках проверок.
      await this.prisma.salesTotalBellEvent.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          periodMonth,
          millions,
          title,
          message,
          href,
        })),
        skipDuplicates: true,
      });

      await Promise.all(
        recipients.map((recipientId) =>
          this.adminBellPush.notifyUsers([recipientId], 'sales_totals', {
            title,
            body: message,
            url: href,
            tag: `sales-totals-${periodMonth}-${millions}-${recipientId}`,
          }),
        ),
      );
    }
  }
}
