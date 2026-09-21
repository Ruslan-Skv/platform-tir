import { Injectable, Logger } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { PrismaService } from '../../database/prisma.service';

/** Данные созданной инкассации для уведомлений (колокольчик + браузерные push). */
export type IncassationNotifyData = {
  id: string;
  /** Менеджер, за которого сдана инкассация (владелец кассы). */
  managerId: string;
  /** Менеджер, фактически сдавший инкассацию (когда один сдаёт за другого). */
  submitterId: string | null;
  managerName: string | null;
  submitterName: string | null;
  amount: number;
  incassator: string;
};

@Injectable()
export class IncassationNotifyService {
  private readonly logger = new Logger(IncassationNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  onCreated(incassation: IncassationNotifyData, actorUserId?: string): void {
    void this.notify(incassation, actorUserId).catch((error) => {
      this.logger.warn(
        `Инкассация: не удалось отправить уведомление — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  /**
   * Получатели: менеджер кассы и сдающий (кроме инициатора записи) плюс все активные
   * супер-админы — те получают уведомление всегда, даже не будучи участниками инкассации.
   * Гейт для каждого — его чекбокс «Инкассации наличных» в настройках уведомлений.
   */
  private async resolveRecipients(
    incassation: IncassationNotifyData,
    actorUserId?: string,
  ): Promise<string[]> {
    const ids = new Set<string>();
    ids.add(incassation.managerId);
    if (incassation.submitterId) ids.add(incassation.submitterId);

    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: { id: true },
    });
    const superAdminIds = new Set(superAdmins.map((admin) => admin.id));
    for (const id of superAdminIds) ids.add(id);

    // Инициатор записи не получает уведомление о собственном действии — кроме супер-админов.
    if (actorUserId && !superAdminIds.has(actorUserId)) ids.delete(actorUserId);
    return [...ids];
  }

  private buildMessage(incassation: IncassationNotifyData): string {
    const amount = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(
      incassation.amount,
    );
    return [
      `${amount} ₽`,
      incassation.managerName,
      incassation.submitterName && incassation.submitterName !== incassation.managerName
        ? `сдал: ${incassation.submitterName}`
        : null,
      `инкассатор: ${incassation.incassator}`,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private async notify(incassation: IncassationNotifyData, actorUserId?: string): Promise<void> {
    const recipients = await this.resolveRecipients(incassation, actorUserId);
    if (recipients.length === 0) return;

    const title = 'Инкассация проведена';
    const message = this.buildMessage(incassation);
    const href = '/admin/dp';

    await this.prisma.managerIncassationBellEvent.createMany({
      data: recipients.map((recipientId) => ({
        recipientId,
        incassationId: incassation.id,
        title,
        message,
        href,
      })),
    });

    await Promise.all(
      recipients.map((recipientId) =>
        this.adminBellPush.notifyUsers([recipientId], 'incassation', {
          title,
          body: message,
          url: href,
          tag: `incassation-${incassation.id}-${recipientId}`,
        }),
      ),
    );
  }
}
