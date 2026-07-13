import { Injectable } from '@nestjs/common';
import { WorkDayCloseReason, WorkDayStatus } from '@prisma/client';
import { AdminBellPushService } from '../../../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../../external-notify/external-notify-settings.service';
import { PrismaService } from '../../../database/prisma.service';

export type WorkDayNotifyKind = 'late' | 'early_leave' | 'auto_closed' | 'reported_close';

const KIND_LABELS: Record<WorkDayNotifyKind, string> = {
  late: 'Опоздание',
  early_leave: 'Ранний уход',
  auto_closed: 'Автозакрытие рабочего дня',
  reported_close: 'Закрытие с указанием времени ухода',
};

const NOTIFY_FIELD: Record<
  WorkDayNotifyKind,
  'notifiedLateAt' | 'notifiedEarlyLeaveAt' | 'notifiedAutoClosedAt' | 'notifiedReportedCloseAt'
> = {
  late: 'notifiedLateAt',
  early_leave: 'notifiedEarlyLeaveAt',
  auto_closed: 'notifiedAutoClosedAt',
  reported_close: 'notifiedReportedCloseAt',
};

@Injectable()
export class WorkDayNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  onWorkDayStarted(workDayId: string, lateMinutes: number): void {
    if (lateMinutes <= 0) return;
    void this.tryNotify('late', workDayId).catch(() => undefined);
  }

  onWorkDayClosed(workDay: {
    id: string;
    status: WorkDayStatus;
    closeReason: WorkDayCloseReason | null;
    earlyLeaveMinutes: number;
  }): void {
    if (workDay.status === WorkDayStatus.AUTO_CLOSED) {
      void this.tryNotify('auto_closed', workDay.id).catch(() => undefined);
      return;
    }
    if (workDay.closeReason === WorkDayCloseReason.REPORTED_NEXT_DAY) {
      void this.tryNotify('reported_close', workDay.id).catch(() => undefined);
      return;
    }
    if (workDay.earlyLeaveMinutes > 0) {
      void this.tryNotify('early_leave', workDay.id).catch(() => undefined);
    }
  }

  private async tryNotify(kind: WorkDayNotifyKind, workDayId: string): Promise<void> {
    const field = NOTIFY_FIELD[kind];
    const claimed = await this.prisma.workDay.updateMany({
      where: { id: workDayId, [field]: null },
      data: { [field]: new Date() },
    });
    if (claimed.count === 0) return;

    const workDay = await this.prisma.workDay.findUnique({
      where: { id: workDayId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
        office: { select: { name: true } },
      },
    });
    if (!workDay) return;

    const employeeName =
      [workDay.user.firstName, workDay.user.lastName].filter(Boolean).join(' ').trim() ||
      workDay.user.email;
    const workDateLabel = workDay.workDate.toLocaleDateString('ru-RU');
    const kindLabel = KIND_LABELS[kind];
    const officeLine = workDay.office?.name ? `Офис: ${workDay.office.name}` : null;

    let detailLine: string | null = null;
    switch (kind) {
      case 'late':
        detailLine = `Опоздание: ${workDay.lateMinutes} мин.`;
        break;
      case 'early_leave':
        detailLine = `Ранний уход: ${workDay.earlyLeaveMinutes} мин.`;
        break;
      case 'auto_closed':
        detailLine = 'Рабочий день закрыт автоматически в конце смены.';
        break;
      case 'reported_close':
        detailLine = workDay.reportedEndAt
          ? `Указанное время ухода: ${workDay.reportedEndAt.toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : 'Сотрудник указал время ухода на следующий день.';
        break;
    }

    const subject = `${kindLabel}: ${employeeName} (${workDateLabel})`;
    const text = [
      'Учёт рабочего времени',
      '',
      `Событие: ${kindLabel}`,
      `Дата: ${workDateLabel}`,
      `Сотрудник: ${employeeName}`,
      `Email: ${workDay.user.email}`,
      workDay.user.role ? `Роль: ${workDay.user.role}` : null,
      officeLine,
      detailLine,
      `Журнал: /admin/crm/work-days?userId=${workDay.userId}`,
    ]
      .filter(Boolean)
      .join('\n');

    const channels = await this.externalNotifySettings.getChannelsForEvent('work_day');
    await this.externalNotify.send(channels, {
      subject,
      text,
      replyTo: workDay.user.email,
      fromLabel: 'Учёт рабочего времени',
    });

    const bodyParts = [employeeName, workDateLabel];
    if (kind === 'late') bodyParts.push(`+${workDay.lateMinutes} мин`);
    if (kind === 'early_leave') bodyParts.push(`−${workDay.earlyLeaveMinutes} мин`);

    await this.adminBellPush.notify('work_day', {
      title: kindLabel,
      body: bodyParts.join(' · '),
      url: `/admin/crm/work-days?userId=${workDay.userId}`,
      tag: `work-day-${kind}-${workDayId}`,
    });
  }
}
