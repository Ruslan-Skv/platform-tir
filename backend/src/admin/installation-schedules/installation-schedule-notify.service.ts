import { Injectable } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { PrismaService } from '../../database/prisma.service';
import { ExternalNotifyService } from '../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../external-notify/external-notify-settings.service';

export type InstallationScheduleNotifyKind = 'created' | 'updated' | 'completed' | 'failed';

const KIND_LABELS: Record<InstallationScheduleNotifyKind, string> = {
  created: 'Новый монтаж в графике',
  updated: 'Изменён монтаж в графике',
  completed: 'Монтаж выполнен',
  failed: 'Монтаж не выполнен',
};

const DIRECTION_LABELS: Record<string, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Натяжные потолки',
  FURNITURE: 'Мебель',
  BLINDS: 'Жалюзи',
};

export type InstallationScheduleNotifyEntry = {
  id: string;
  date: Date;
  timeFrom: string | null;
  timeTo: string | null;
  timeText: string | null;
  direction: string;
  installerId: string | null;
  installerName: string | null;
  contractNumber: string | null;
  workOrderLabel: string | null;
  orderInfo: string | null;
  packageId: string | null;
  createdById: string | null;
  completionNote?: string | null;
};

@Injectable()
export class InstallationScheduleNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
  ) {}

  onCreated(entry: InstallationScheduleNotifyEntry, actorUserId: string): void {
    void this.notify('created', entry, actorUserId).catch(() => undefined);
  }

  onUpdated(entry: InstallationScheduleNotifyEntry, actorUserId: string): void {
    void this.notify('updated', entry, actorUserId).catch(() => undefined);
  }

  onCompleted(entry: InstallationScheduleNotifyEntry, actorUserId: string): void {
    void this.notify('completed', entry, actorUserId).catch(() => undefined);
  }

  onFailed(entry: InstallationScheduleNotifyEntry, actorUserId: string): void {
    void this.notify('failed', entry, actorUserId).catch(() => undefined);
  }

  private async resolveInstallerUserId(
    entry: InstallationScheduleNotifyEntry,
  ): Promise<string | null> {
    if (!entry.installerId) return null;
    const installer = await this.prisma.installerMaster.findUnique({
      where: { id: entry.installerId },
      select: { userId: true },
    });
    return installer?.userId ?? null;
  }

  private hrefForRecipient(recipientId: string, installerUserId: string | null): string {
    return recipientId === installerUserId
      ? '/admin/crm/installation-schedules/my'
      : '/admin/crm/installation-schedules';
  }

  private async recipientIds(
    entry: InstallationScheduleNotifyEntry,
    actorUserId: string,
    installerUserId: string | null,
  ): Promise<string[]> {
    const ids = new Set<string>();
    if (entry.createdById) ids.add(entry.createdById);
    if (entry.packageId) {
      const pkg = await this.prisma.contractDocumentPackage.findUnique({
        where: { id: entry.packageId },
        select: { responsibleManagerId: true },
      });
      if (pkg?.responsibleManagerId) ids.add(pkg.responsibleManagerId);
    }
    if (installerUserId) ids.add(installerUserId);
    ids.delete(actorUserId);
    return [...ids];
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private formatTime(entry: InstallationScheduleNotifyEntry): string {
    if (entry.timeText?.trim()) return entry.timeText.trim();
    if (entry.timeFrom && entry.timeTo) return `${entry.timeFrom}–${entry.timeTo}`;
    if (entry.timeFrom) return `с ${entry.timeFrom}`;
    if (entry.timeTo) return `до ${entry.timeTo}`;
    return 'время не указано';
  }

  private directionLabel(direction: string): string {
    return DIRECTION_LABELS[direction] ?? direction;
  }

  private buildMessage(
    kind: InstallationScheduleNotifyKind,
    entry: InstallationScheduleNotifyEntry,
  ): string {
    const parts = [
      this.formatDate(entry.date),
      this.formatTime(entry),
      this.directionLabel(entry.direction),
      entry.installerName?.trim() || null,
      entry.contractNumber?.trim() || null,
      entry.workOrderLabel?.trim()?.slice(0, 80) || entry.orderInfo?.trim()?.slice(0, 80) || null,
    ].filter(Boolean);
    if ((kind === 'completed' || kind === 'failed') && entry.completionNote?.trim()) {
      parts.push(entry.completionNote.trim().slice(0, 80));
    }
    return parts.join(' · ');
  }

  private async notify(
    kind: InstallationScheduleNotifyKind,
    entry: InstallationScheduleNotifyEntry,
    actorUserId: string,
  ): Promise<void> {
    const title = KIND_LABELS[kind];
    const message = this.buildMessage(kind, entry);
    const installerUserId = await this.resolveInstallerUserId(entry);
    const recipients = await this.recipientIds(entry, actorUserId, installerUserId);

    if (recipients.length > 0) {
      await this.prisma.installationScheduleBellEvent.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          installationScheduleId: entry.id,
          kind,
          title,
          message,
          href: this.hrefForRecipient(recipientId, installerUserId),
        })),
      });

      await Promise.all(
        recipients.map((recipientId) => {
          const href = this.hrefForRecipient(recipientId, installerUserId);
          return this.adminBellPush.notifyUsers([recipientId], 'installation_schedule', {
            title,
            body: message,
            url: href,
            tag: `installation-schedule-${kind}-${entry.id}-${recipientId}`,
          });
        }),
      );
    }

    const channels = await this.externalNotifySettings.getChannelsForEvent('installation_schedule');
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
        subject: `${title} (${this.formatDate(entry.date)})`,
        text: [
          'График монтажей',
          '',
          `Событие: ${title}`,
          `Дата: ${this.formatDate(entry.date)}`,
          `Время: ${this.formatTime(entry)}`,
          `Направление: ${this.directionLabel(entry.direction)}`,
          entry.installerName?.trim() ? `Монтажник: ${entry.installerName.trim()}` : null,
          entry.contractNumber?.trim() ? `Договор: ${entry.contractNumber.trim()}` : null,
          entry.workOrderLabel?.trim() ? `Заказ-наряд: ${entry.workOrderLabel.trim()}` : null,
          entry.orderInfo?.trim() ? `Информация: ${entry.orderInfo.trim()}` : null,
          entry.completionNote?.trim() ? `Комментарий: ${entry.completionNote.trim()}` : null,
          `Кто: ${actorName}`,
          'Список: /admin/crm/installation-schedules',
          'Мои монтажи: /admin/crm/installation-schedules/my',
        ]
          .filter(Boolean)
          .join('\n'),
        fromLabel: 'График монтажей',
      });
    }
  }
}
