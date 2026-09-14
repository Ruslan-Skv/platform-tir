import { Injectable, Logger } from '@nestjs/common';
import { AdminBellPushService } from '../bell-push/admin-bell-push.service';
import { PrismaService } from '../database/prisma.service';

export type ContractSigningNotifyKind = 'signed' | 'rejected' | 'viewed';

const KIND_LABELS: Record<ContractSigningNotifyKind, string> = {
  signed: 'Договоры подписаны',
  rejected: 'Подписание отклонено',
  viewed: 'Документы открыты клиентом',
};

type ContractSigningNotifySession = {
  id: string;
  packageId: string;
  customerName: string | null;
  createdById: string | null;
};

/** Уведомления автору сессии подписания о её статусе (колокольчик + push). */
@Injectable()
export class ContractSigningNotifyService {
  private readonly logger = new Logger(ContractSigningNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  onSessionEvent(
    kind: ContractSigningNotifyKind,
    session: ContractSigningNotifySession,
    packageTitle: string,
    details?: { rejectionReason?: string | null; signedName?: string | null },
  ): void {
    void this.notify(kind, session, packageTitle, details).catch((err) => {
      this.logger.warn(`Не удалось отправить уведомление о подписании: ${String(err)}`);
    });
  }

  private buildMessage(
    kind: ContractSigningNotifyKind,
    session: ContractSigningNotifySession,
    packageTitle: string,
    details?: { rejectionReason?: string | null; signedName?: string | null },
  ): string {
    const parts = [packageTitle];
    if (kind === 'signed' && details?.signedName) {
      parts.push(`подписал: ${details.signedName}`);
    } else if (session.customerName) {
      parts.push(session.customerName);
    }
    if (kind === 'rejected' && details?.rejectionReason) {
      parts.push(`причина: ${details.rejectionReason.slice(0, 120)}`);
    }
    return parts.join(' · ');
  }

  private async notify(
    kind: ContractSigningNotifyKind,
    session: ContractSigningNotifySession,
    packageTitle: string,
    details?: { rejectionReason?: string | null; signedName?: string | null },
  ): Promise<void> {
    const recipientId = session.createdById;
    if (!recipientId) return;

    const title = KIND_LABELS[kind];
    const message = this.buildMessage(kind, session, packageTitle, details);
    const href = `/admin/contract-documents/contracts/${session.packageId}`;

    await this.prisma.contractSigningBellEvent.create({
      data: {
        recipientId,
        packageId: session.packageId,
        sessionId: session.id,
        kind,
        title,
        message,
        href,
      },
    });

    await this.adminBellPush.notifyUsers([recipientId], 'contract_signing', {
      title,
      body: message,
      url: href,
      tag: `contract-signing-${kind}-${session.id}`,
    });
  }
}
