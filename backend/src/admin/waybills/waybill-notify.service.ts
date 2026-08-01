import { Injectable } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../external-notify/external-notify-settings.service';
import { PrismaService } from '../../database/prisma.service';

export type WaybillNotifyKind = 'created' | 'updated' | 'completed' | 'failed';

const KIND_LABELS: Record<WaybillNotifyKind, string> = {
  created: 'Новое задание в путевом листе',
  updated: 'Изменено задание в путевом листе',
  completed: 'Задание выполнено',
  failed: 'Задание не выполнено',
};

type WaybillNotifyTask = {
  id: string;
  date: Date;
  timeFrom: string | null;
  timeTo: string | null;
  direction: string | null;
  taskText: string;
  driverUserId: string | null;
  responsibleUserId: string | null;
  completionNote?: string | null;
};

@Injectable()
export class WaybillNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
  ) {}

  onCreated(task: WaybillNotifyTask, actorUserId: string): void {
    void this.notify('created', task, actorUserId).catch(() => undefined);
  }

  onUpdated(task: WaybillNotifyTask, actorUserId: string): void {
    void this.notify('updated', task, actorUserId).catch(() => undefined);
  }

  onCompleted(task: WaybillNotifyTask, actorUserId: string): void {
    void this.notify('completed', task, actorUserId).catch(() => undefined);
  }

  onFailed(task: WaybillNotifyTask, actorUserId: string): void {
    void this.notify('failed', task, actorUserId).catch(() => undefined);
  }

  private recipientIds(task: WaybillNotifyTask, actorUserId: string): string[] {
    const ids = new Set<string>();
    if (task.driverUserId) ids.add(task.driverUserId);
    if (task.responsibleUserId) ids.add(task.responsibleUserId);
    ids.delete(actorUserId);
    return [...ids];
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private formatTime(task: WaybillNotifyTask): string {
    if (task.timeFrom && task.timeTo) return `${task.timeFrom}–${task.timeTo}`;
    if (task.timeFrom) return `с ${task.timeFrom}`;
    if (task.timeTo) return `до ${task.timeTo}`;
    return 'время не указано';
  }

  private buildMessage(kind: WaybillNotifyKind, task: WaybillNotifyTask): string {
    const parts = [
      this.formatDate(task.date),
      this.formatTime(task),
      task.direction?.trim() || null,
      task.taskText.trim().slice(0, 120),
    ].filter(Boolean);
    if ((kind === 'completed' || kind === 'failed') && task.completionNote?.trim()) {
      parts.push(task.completionNote.trim().slice(0, 80));
    }
    return parts.join(' · ');
  }

  private hrefForRecipient(recipientId: string, task: WaybillNotifyTask): string {
    return recipientId === task.driverUserId ? '/admin/crm/waybills/my' : '/admin/crm/waybills';
  }

  private async notify(
    kind: WaybillNotifyKind,
    task: WaybillNotifyTask,
    actorUserId: string,
  ): Promise<void> {
    const title = KIND_LABELS[kind];
    const message = this.buildMessage(kind, task);
    const recipients = this.recipientIds(task, actorUserId);

    if (recipients.length > 0) {
      await this.prisma.waybillTaskBellEvent.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          waybillTaskId: task.id,
          kind,
          title,
          message,
          href: this.hrefForRecipient(recipientId, task),
        })),
      });

      await Promise.all(
        recipients.map((recipientId) =>
          this.adminBellPush.notifyUsers([recipientId], 'waybill', {
            title,
            body: message,
            url: this.hrefForRecipient(recipientId, task),
            tag: `waybill-${kind}-${task.id}-${recipientId}`,
          }),
        ),
      );
    }

    const channels = await this.externalNotifySettings.getChannelsForEvent('waybill');
    if (channels.emails.length || channels.telegramIds.length || channels.maxIds.length) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      const actorName =
        [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim() ||
        actor?.email ||
        actorUserId;
      await this.externalNotify.send(channels, {
        subject: `${title} (${this.formatDate(task.date)})`,
        text: [
          'Путевой лист',
          '',
          `Событие: ${title}`,
          `Дата: ${this.formatDate(task.date)}`,
          `Время: ${this.formatTime(task)}`,
          task.direction ? `Направление: ${task.direction}` : null,
          `Задание: ${task.taskText.trim()}`,
          task.completionNote?.trim() ? `Комментарий: ${task.completionNote.trim()}` : null,
          `Кто: ${actorName}`,
          'Список: /admin/crm/waybills',
          'Маршрут водителя: /admin/crm/waybills/my',
        ]
          .filter(Boolean)
          .join('\n'),
        fromLabel: 'Путевой лист',
      });
    }
  }
}
