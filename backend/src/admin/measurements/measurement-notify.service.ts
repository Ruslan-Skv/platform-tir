import { Injectable } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { ExternalNotifyService } from '../../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../../external-notify/external-notify-settings.service';
import { PrismaService } from '../../database/prisma.service';

export type MeasurementNotifyKind = 'created' | 'completed' | 'cancelled' | 'converted';

const KIND_LABELS: Record<MeasurementNotifyKind, string> = {
  created: 'Новый замер',
  completed: 'Замер выполнен',
  cancelled: 'Отказ по замеру',
  converted: 'По замеру заключён договор',
};

type MeasurementNotifyData = {
  id: string;
  managerId: string;
  surveyorId: string | null;
  customerName: string;
  customerAddress: string | null;
  executionDate: Date | null;
};

@Injectable()
export class MeasurementNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
  ) {}

  onCreated(measurement: MeasurementNotifyData, actorUserId?: string): void {
    void this.notify('created', measurement, actorUserId).catch(() => undefined);
  }

  onStatusChanged(measurement: MeasurementNotifyData, status: string, actorUserId?: string): void {
    const kind: MeasurementNotifyKind | null =
      status === 'COMPLETED'
        ? 'completed'
        : status === 'CANCELLED'
          ? 'cancelled'
          : status === 'CONVERTED'
            ? 'converted'
            : null;
    if (!kind) return;
    void this.notify(kind, measurement, actorUserId).catch(() => undefined);
  }

  private recipientIds(measurement: MeasurementNotifyData, actorUserId?: string): string[] {
    const ids = new Set<string>();
    ids.add(measurement.managerId);
    if (measurement.surveyorId) ids.add(measurement.surveyorId);
    if (actorUserId) ids.delete(actorUserId);
    return [...ids];
  }

  private formatDate(d: Date | null): string | null {
    if (!d) return null;
    return d.toISOString().slice(0, 10);
  }

  private buildMessage(measurement: MeasurementNotifyData): string {
    return [
      measurement.customerName.trim().slice(0, 120),
      measurement.customerAddress?.trim().slice(0, 120) || null,
      this.formatDate(measurement.executionDate),
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private async notify(
    kind: MeasurementNotifyKind,
    measurement: MeasurementNotifyData,
    actorUserId?: string,
  ): Promise<void> {
    const title = KIND_LABELS[kind];
    const message = this.buildMessage(measurement);
    const recipients = this.recipientIds(measurement, actorUserId);

    if (recipients.length > 0) {
      await this.prisma.measurementBellEvent.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          measurementId: measurement.id,
          kind,
          title,
          message,
          href: `/admin/crm/measurements/${measurement.id}`,
        })),
      });

      await Promise.all(
        recipients.map((recipientId) =>
          this.adminBellPush.notifyUsers([recipientId], 'measurement', {
            title,
            body: message,
            url: `/admin/crm/measurements/${measurement.id}`,
            tag: `measurement-${kind}-${measurement.id}-${recipientId}`,
          }),
        ),
      );
    }

    const channels = await this.externalNotifySettings.getChannelsForEvent('measurement');
    if (channels.emails.length || channels.telegramIds.length || channels.maxIds.length) {
      const actor = actorUserId
        ? await this.prisma.user.findUnique({
            where: { id: actorUserId },
            select: { firstName: true, lastName: true, email: true },
          })
        : null;
      const actorName =
        [actor?.firstName, actor?.lastName].filter(Boolean).join(' ').trim() ||
        actor?.email ||
        (actorUserId ?? 'система');
      await this.externalNotify.send(channels, {
        subject: title,
        text: [
          'Замеры',
          '',
          `Событие: ${title}`,
          `Клиент: ${measurement.customerName.trim()}`,
          measurement.customerAddress?.trim()
            ? `Адрес: ${measurement.customerAddress.trim()}`
            : null,
          measurement.executionDate
            ? `Дата замера: ${this.formatDate(measurement.executionDate)}`
            : null,
          `Кто: ${actorName}`,
          `Карточка: /admin/crm/measurements/${measurement.id}`,
        ]
          .filter(Boolean)
          .join('\n'),
        fromLabel: 'Замеры',
      });
    }
  }
}
