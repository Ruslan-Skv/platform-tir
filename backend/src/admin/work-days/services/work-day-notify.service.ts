import { Injectable } from '@nestjs/common';
import { WorkDayCloseReason, WorkDayStatus } from '@prisma/client';
import { AdminBellPushService } from '../../../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../../external-notify/external-notify-settings.service';
import { PrismaService } from '../../../database/prisma.service';

export type WorkDayNotifyKind =
  | 'late'
  | 'early_leave'
  | 'auto_closed'
  | 'reported_close'
  | 'day_off_request'
  | 'early_leave_request'
  | 'late_arrival_request';

const KIND_LABELS: Record<WorkDayNotifyKind, string> = {
  late: 'Опоздание',
  early_leave: 'Ранний уход',
  auto_closed: 'Автозакрытие рабочего дня',
  reported_close: 'Закрытие с указанием времени ухода',
  day_off_request: 'Запрос выходного',
  early_leave_request: 'Запрос уйти пораньше',
  late_arrival_request: 'Запрос прийти попозже',
};

const NOTIFY_FIELD: Partial<
  Record<
    WorkDayNotifyKind,
    'notifiedLateAt' | 'notifiedEarlyLeaveAt' | 'notifiedAutoClosedAt' | 'notifiedReportedCloseAt'
  >
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

  onRequestCreated(requestId: string): void {
    void this.notifyRequest(requestId).catch(() => undefined);
  }

  private async notifyRequest(requestId: string): Promise<void> {
    const request = await this.prisma.workDayRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
    });
    if (!request || request.status !== 'PENDING') return;

    const kind: WorkDayNotifyKind =
      request.type === 'DAY_OFF'
        ? 'day_off_request'
        : request.type === 'EARLY_LEAVE'
          ? 'early_leave_request'
          : 'late_arrival_request';
    const employeeName =
      [request.user.firstName, request.user.lastName].filter(Boolean).join(' ').trim() ||
      request.user.email;
    const workDateLabel = request.requestDate.toLocaleDateString('ru-RU');
    const kindLabel = KIND_LABELS[kind];
    const detailLine =
      request.type === 'EARLY_LEAVE' && request.proposedEndTime
        ? `Желаемое время ухода: ${request.proposedEndTime}`
        : request.type === 'LATE_ARRIVAL' && request.proposedEndTime
          ? `Желаемое время прихода: ${request.proposedEndTime}`
          : request.comment
            ? `Комментарий: ${request.comment}`
            : null;

    const subject = `${kindLabel}: ${employeeName} (${workDateLabel})`;
    const text = [
      'Учёт рабочего времени',
      '',
      `Событие: ${kindLabel}`,
      `Дата: ${workDateLabel}`,
      `Сотрудник: ${employeeName}`,
      `Email: ${request.user.email}`,
      request.user.role ? `Роль: ${request.user.role}` : null,
      detailLine,
      `Запросы: /admin/crm/work-day-requests`,
    ]
      .filter(Boolean)
      .join('\n');

    const channels = await this.externalNotifySettings.getChannelsForEvent('work_day');
    await this.externalNotify.send(channels, {
      subject,
      text,
      replyTo: request.user.email,
      fromLabel: 'Учёт рабочего времени',
    });

    const bodyParts = [employeeName, workDateLabel];
    if (
      (request.type === 'EARLY_LEAVE' || request.type === 'LATE_ARRIVAL') &&
      request.proposedEndTime
    ) {
      bodyParts.push(request.proposedEndTime);
    }

    await this.adminBellPush.notify('work_day', {
      title: kindLabel,
      body: bodyParts.join(' · '),
      url: `/admin/crm/work-day-requests?id=${request.id}`,
      tag: `work-day-request-${request.id}`,
    });
  }

  private async tryNotify(kind: WorkDayNotifyKind, workDayId: string): Promise<void> {
    const field = NOTIFY_FIELD[kind];
    if (!field) return;
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
      default:
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
