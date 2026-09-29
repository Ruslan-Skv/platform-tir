import { Injectable, Logger } from '@nestjs/common';
import { ContractDocumentPackageKind } from '@prisma/client';
import {
  AdminBellPushService,
  type AdminBellPushEvent,
} from '../bell-push/admin-bell-push.service';
import { AdminNotificationSettingsReaderService } from '../bell-push/admin-notification-settings-reader.service';
import { ExternalNotifyService } from '../external-notify/external-notify.service';
import { ExternalNotifySettingsService } from '../external-notify/external-notify-settings.service';
import { PrismaService } from '../database/prisma.service';

const DIRECTION_LABELS: Record<ContractDocumentPackageKind, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  BLINDS: 'Жалюзи',
  FURNITURE: 'Мебель',
};

const PUSH_EVENTS: Record<ContractDocumentPackageKind, AdminBellPushEvent> = {
  REPAIR: 'contract_concluded_repair',
  WINDOWS: 'contract_concluded_windows',
  DOORS: 'contract_concluded_doors',
  CEILINGS: 'contract_concluded_ceilings',
  BLINDS: 'contract_concluded_blinds',
  FURNITURE: 'contract_concluded_furniture',
};

/** Флаги настроек по направлениям — те же ключи, что в my-notifications. */
const DIRECTION_FLAGS: Record<ContractDocumentPackageKind, string> = {
  REPAIR: 'notifyOnContractConcludedRepair',
  WINDOWS: 'notifyOnContractConcludedWindows',
  DOORS: 'notifyOnContractConcludedDoors',
  CEILINGS: 'notifyOnContractConcludedCeilings',
  BLINDS: 'notifyOnContractConcludedBlinds',
  FURNITURE: 'notifyOnContractConcludedFurniture',
};

const ALL_KINDS = Object.keys(DIRECTION_LABELS) as ContractDocumentPackageKind[];

export type ContractConcludedNotifyData = {
  id: string;
  kind: string;
  title: string | null;
  formData: unknown;
  responsibleManagerId: string | null;
  createdById: string | null;
};

/** Уведомления «Договор подписан» при переводе пакета в CONTRACT_CONCLUDED. */
@Injectable()
export class ContractConcludedNotifyService {
  private readonly logger = new Logger(ContractConcludedNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
    private readonly settingsReader: AdminNotificationSettingsReaderService,
    private readonly externalNotify: ExternalNotifyService,
    private readonly externalNotifySettings: ExternalNotifySettingsService,
  ) {}

  onConcluded(pkg: ContractConcludedNotifyData, actorUserId?: string | null): void {
    void this.notify(pkg, actorUserId).catch((err) => {
      this.logger.warn(`Не удалось отправить уведомление «Договор подписан»: ${String(err)}`);
    });
  }

  private direction(pkg: ContractConcludedNotifyData): ContractDocumentPackageKind {
    return (ALL_KINDS as string[]).includes(pkg.kind)
      ? (pkg.kind as ContractDocumentPackageKind)
      : 'REPAIR';
  }

  private contractNumberFromFormData(formData: unknown): string | null {
    if (!formData || typeof formData !== 'object') return null;
    const fd = formData as Record<string, unknown>;
    const contract =
      fd.contract && typeof fd.contract === 'object'
        ? (fd.contract as Record<string, unknown>)
        : null;
    const num = typeof contract?.number === 'string' ? contract.number.trim() : '';
    if (num) return num;
    const furniture = fd.furniture;
    if (furniture && typeof furniture === 'object') {
      const legs = furniture as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of ['manufacture', 'montage', 'appliances'] as const) {
        const leg = legs[key];
        if (!leg || typeof leg !== 'object') continue;
        const enabled = (leg as { enabled?: unknown }).enabled;
        if (key !== 'manufacture' && enabled !== true) continue;
        const legContract = (leg as { contract?: unknown }).contract;
        if (!legContract || typeof legContract !== 'object') continue;
        const legNum = (legContract as { number?: unknown }).number;
        if (typeof legNum === 'string' && legNum.trim()) parts.push(legNum.trim());
      }
      if (parts.length > 0) return parts.join(' / ');
    }
    return null;
  }

  private customerNameFromFormData(formData: unknown): string | null {
    if (!formData || typeof formData !== 'object') return null;
    const fd = formData as Record<string, unknown>;
    const c =
      fd.customer && typeof fd.customer === 'object'
        ? (fd.customer as Record<string, unknown>)
        : null;
    if (!c) return null;
    const type = c.type;
    if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
      const org = typeof c.organizationName === 'string' ? c.organizationName.trim() : '';
      return org || null;
    }
    const full = typeof c.fullName === 'string' ? c.fullName.trim() : '';
    return full || null;
  }

  private buildMessage(pkg: ContractConcludedNotifyData): string {
    return [
      this.contractNumberFromFormData(pkg.formData),
      this.customerNameFromFormData(pkg.formData),
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private async notify(pkg: ContractConcludedNotifyData, actorUserId?: string | null) {
    const direction = this.direction(pkg);
    const directionLabel = DIRECTION_LABELS[direction];
    const title = `Договор подписан — ${directionLabel}`;
    const message = this.buildMessage(pkg);
    const href = `/admin/contract-documents/contracts/${pkg.id}`;
    const recipients = await this.settingsReader.getUserIdsWithEventEnabled(
      DIRECTION_FLAGS[direction],
    );

    if (recipients.length > 0) {
      await this.prisma.contractConcludedBellEvent.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          packageId: pkg.id,
          kind: direction,
          title,
          message,
          href,
        })),
      });

      await Promise.all(
        recipients.map((recipientId) =>
          this.adminBellPush.notifyUsers([recipientId], PUSH_EVENTS[direction], {
            title,
            body: message,
            url: href,
            tag: `contract-concluded-${direction}-${pkg.id}-${recipientId}`,
          }),
        ),
      );
    }

    const channels = await this.externalNotifySettings.getChannelsForEvent('contract_concluded');
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
        (actorUserId ?? 'клиент по ссылке подписания');
      await this.externalNotify.send(channels, {
        subject: title,
        text: [
          'Договоры',
          '',
          `Событие: ${title}`,
          this.contractNumberFromFormData(pkg.formData)
            ? `Номер: ${this.contractNumberFromFormData(pkg.formData)}`
            : null,
          this.customerNameFromFormData(pkg.formData)
            ? `Клиент: ${this.customerNameFromFormData(pkg.formData)}`
            : null,
          `Кто: ${actorName}`,
          `Карточка: ${href}`,
        ]
          .filter(Boolean)
          .join('\n'),
        fromLabel: 'Договоры',
      });
    }
  }
}
