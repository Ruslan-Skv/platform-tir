import { Injectable } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { PrismaService } from '../../database/prisma.service';
import { ExternalNotifyService } from '../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../external-notify/external-notify-settings.service';

export type FurnitureScheduleNotifyKind = 'created' | 'updated' | 'status_changed' | 'entry_added';

const KIND_LABELS: Record<FurnitureScheduleNotifyKind, string> = {
  created: 'Новый проект мебели',
  updated: 'Изменён проект мебели',
  status_changed: 'Смена статуса мебели',
  entry_added: 'Новая запись по мебели',
};

export type FurnitureScheduleNotifyProject = {
  id: string;
  status: string;
  contractNumber: string | null;
  workScope: string | null;
  installerId: string | null;
  installerName: string | null;
  customerAddress: string | null;
  packageId: string | null;
  createdById: string | null;
  entryText?: string | null;
};

@Injectable()
export class FurnitureScheduleNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
  ) {}

  onCreated(project: FurnitureScheduleNotifyProject, actorUserId: string): void {
    void this.notify('created', project, actorUserId).catch(() => undefined);
  }

  onUpdated(project: FurnitureScheduleNotifyProject, actorUserId: string): void {
    void this.notify('updated', project, actorUserId).catch(() => undefined);
  }

  onStatusChanged(project: FurnitureScheduleNotifyProject, actorUserId: string): void {
    void this.notify('status_changed', project, actorUserId).catch(() => undefined);
  }

  onEntryAdded(project: FurnitureScheduleNotifyProject, actorUserId: string): void {
    void this.notify('entry_added', project, actorUserId).catch(() => undefined);
  }

  private async resolveInstallerUserId(
    project: FurnitureScheduleNotifyProject,
  ): Promise<string | null> {
    if (!project.installerId) return null;
    const installer = await this.prisma.installerMaster.findUnique({
      where: { id: project.installerId },
      select: { userId: true },
    });
    return installer?.userId ?? null;
  }

  private hrefForRecipient(
    projectId: string,
    recipientId: string,
    installerUserId: string | null,
  ): string {
    return recipientId === installerUserId
      ? '/admin/crm/furniture-schedules/my'
      : `/admin/crm/furniture-schedules/${projectId}`;
  }

  private async recipientIds(
    project: FurnitureScheduleNotifyProject,
    actorUserId: string,
    installerUserId: string | null,
  ): Promise<string[]> {
    const ids = new Set<string>();
    if (project.createdById) ids.add(project.createdById);
    if (project.packageId) {
      const pkg = await this.prisma.contractDocumentPackage.findUnique({
        where: { id: project.packageId },
        select: { responsibleManagerId: true },
      });
      if (pkg?.responsibleManagerId) ids.add(pkg.responsibleManagerId);
    }
    if (installerUserId) ids.add(installerUserId);
    ids.delete(actorUserId);
    return [...ids];
  }

  private statusLabel(status: string): string {
    if (status === 'NEW') return 'На очереди';
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'CLAIMS') return 'Рекламации';
    if (status === 'CLOSED') return 'Закрытые';
    return status;
  }

  private buildMessage(
    kind: FurnitureScheduleNotifyKind,
    project: FurnitureScheduleNotifyProject,
  ): string {
    const parts = [
      this.statusLabel(project.status),
      project.contractNumber?.trim() || null,
      project.installerName?.trim() || null,
      project.customerAddress?.trim()?.slice(0, 60) || null,
      project.workScope?.trim()?.slice(0, 60) || null,
    ].filter(Boolean);
    if (kind === 'entry_added' && project.entryText?.trim()) {
      parts.push(project.entryText.trim().slice(0, 80));
    }
    return parts.join(' · ');
  }

  private async notify(
    kind: FurnitureScheduleNotifyKind,
    project: FurnitureScheduleNotifyProject,
    actorUserId: string,
  ): Promise<void> {
    const title = KIND_LABELS[kind];
    const message = this.buildMessage(kind, project);
    const installerUserId = await this.resolveInstallerUserId(project);
    const recipients = await this.recipientIds(project, actorUserId, installerUserId);

    if (recipients.length > 0) {
      await this.prisma.furnitureScheduleBellEvent.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          furnitureScheduleProjectId: project.id,
          kind,
          title,
          message,
          href: this.hrefForRecipient(project.id, recipientId, installerUserId),
        })),
      });

      await Promise.all(
        recipients.map((recipientId) => {
          const href = this.hrefForRecipient(project.id, recipientId, installerUserId);
          return this.adminBellPush.notifyUsers([recipientId], 'furniture_schedule', {
            title,
            body: message,
            url: href,
            tag: `furniture-schedule-${kind}-${project.id}-${recipientId}`,
          });
        }),
      );
    }

    const channels = await this.externalNotifySettings.getChannelsForEvent('furniture_schedule');
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
        subject: `${title}${project.contractNumber ? ` (${project.contractNumber})` : ''}`,
        text: [
          'План-график мебели',
          '',
          `Событие: ${title}`,
          `Статус: ${this.statusLabel(project.status)}`,
          project.contractNumber?.trim() ? `Договор: ${project.contractNumber.trim()}` : null,
          project.installerName?.trim() ? `Мастер: ${project.installerName.trim()}` : null,
          project.customerAddress?.trim() ? `Адрес: ${project.customerAddress.trim()}` : null,
          project.workScope?.trim() ? `Объём: ${project.workScope.trim()}` : null,
          project.entryText?.trim() ? `Запись: ${project.entryText.trim()}` : null,
          `Кто: ${actorName}`,
          'Список: /admin/crm/furniture-schedules',
          `Карточка: /admin/crm/furniture-schedules/${project.id}`,
          'Моя мебель: /admin/crm/furniture-schedules/my',
        ]
          .filter(Boolean)
          .join('\n'),
        fromLabel: 'План-график мебели',
      });
    }
  }
}
