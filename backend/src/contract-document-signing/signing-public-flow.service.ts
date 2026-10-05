import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ContractDocumentSigningSessionStatus } from '@prisma/client';

import { ContractDocumentNumberingService } from '../contract-document-numbering/contract-document-numbering.service';
import { PrismaService } from '../database/prisma.service';
import { ContractSigningNotifyService } from './contract-signing-notify.service';
import { SigningCompletionService } from './finalize/signing-completion.service';
import { SigningPackageMarkerService } from './signing-package-marker.service';
import { normalizePaymentQrs, sha256Hex } from './signing-session-dto';
import {
  type SigningSessionDocumentMeta,
  isUnsignedSigningAttachment,
} from './signing-session-documents';
import { assertSigningChronologyAtSign, detectSigningStage } from './signing-stage';
import { SigningStageEffectsService } from './signing-stage-effects.service';

const MAX_OTP_ATTEMPTS = 8;

/**
 * Публичный поток дистанционного подписания (страница /sign/<token>):
 * выдача сессии заказчику, отметка просмотра, подписание по OTP и отклонение.
 * Создание/отзыв сессий — админовый ContractDocumentSigningService.
 */
@Injectable()
export class ContractDocumentSigningPublicService {
  private readonly logger = new Logger(ContractDocumentSigningPublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractNumbering: ContractDocumentNumberingService,
    private readonly signingNotify: ContractSigningNotifyService,
    private readonly packageMarker: SigningPackageMarkerService,
    private readonly stageEffects: SigningStageEffectsService,
    private readonly completion: SigningCompletionService,
  ) {}

  private async getByTokenOrThrow(token: string) {
    const row = await this.prisma.contractDocumentSigningSession.findUnique({
      where: { token },
      include: {
        package: {
          select: {
            id: true,
            kind: true,
            title: true,
            status: true,
            deletedAt: true,
            formData: true,
          },
        },
      },
    });
    if (!row || row.package.deletedAt) throw new NotFoundException('Ссылка недействительна');
    if (row.status === ContractDocumentSigningSessionStatus.CANCELLED) {
      throw new ForbiddenException('Ссылка отозвана');
    }
    if (
      row.status !== ContractDocumentSigningSessionStatus.SIGNED &&
      row.status !== ContractDocumentSigningSessionStatus.REJECTED &&
      row.expiresAt.getTime() < Date.now()
    ) {
      if (row.status !== ContractDocumentSigningSessionStatus.EXPIRED) {
        await this.prisma.contractDocumentSigningSession.update({
          where: { id: row.id },
          data: { status: ContractDocumentSigningSessionStatus.EXPIRED },
        });
        await this.contractNumbering.releaseHoldsForSession(row.id);
      }
      throw new ForbiddenException('Срок действия ссылки истёк');
    }
    return row;
  }

  async getPublicSession(token: string) {
    const row = await this.getByTokenOrThrow(token);
    const documents = (
      Array.isArray(row.documents) ? row.documents : []
    ) as SigningSessionDocumentMeta[];
    return {
      status: row.status,
      customerName: row.customerName,
      contractTitle: row.package.title ?? 'Договор',
      packageKind: row.package.kind,
      managerNote: row.managerNote,
      expiresAt: row.expiresAt.toISOString(),
      viewedAt: row.viewedAt?.toISOString() ?? null,
      signedAt: row.signedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      signedName: row.signedName,
      paymentQrs: normalizePaymentQrs(
        (Array.isArray(row.paymentQrs) ? row.paymentQrs : []) as Array<{
          url: string;
          title?: string | null;
        }>,
      ),
      documents: documents.map((d) => ({
        tabId: d.tabId,
        label: d.label,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        ...(isUnsignedSigningAttachment(d) ? { unsignedAttachment: true } : {}),
      })),
      canSign:
        row.status === ContractDocumentSigningSessionStatus.PENDING ||
        row.status === ContractDocumentSigningSessionStatus.VIEWED,
    };
  }

  async markViewed(token: string) {
    const row = await this.getByTokenOrThrow(token);
    if (row.status === ContractDocumentSigningSessionStatus.PENDING) {
      const updated = await this.prisma.contractDocumentSigningSession.update({
        where: { id: row.id },
        data: {
          status: ContractDocumentSigningSessionStatus.VIEWED,
          viewedAt: new Date(),
        },
      });
      await this.packageMarker.patch(row.packageId, {
        sessionId: updated.id,
        status: updated.status,
        sentAt: updated.createdAt.toISOString(),
        expiresAt: updated.expiresAt.toISOString(),
        viewedAt: updated.viewedAt?.toISOString() ?? null,
        signedAt: null,
        documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
      });

      this.signingNotify.onSessionEvent('viewed', row, row.package.title ?? 'Договор');
    }
    return this.getPublicSession(token);
  }

  async sign(
    token: string,
    input: { otpCode: string; signedName: string; consent: boolean },
    meta: { ip?: string; userAgent?: string },
  ) {
    if (!input.consent) {
      throw new BadRequestException('Необходимо согласие с условиями подписания');
    }
    const signedName = input.signedName?.trim();
    if (!signedName || signedName.length < 2) {
      throw new BadRequestException('Укажите ФИО подписанта');
    }
    const otpCode = String(input.otpCode || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(otpCode)) {
      throw new BadRequestException('Введите 6-значный код подтверждения');
    }

    const row = await this.getByTokenOrThrow(token);
    if (
      row.status !== ContractDocumentSigningSessionStatus.PENDING &&
      row.status !== ContractDocumentSigningSessionStatus.VIEWED
    ) {
      throw new BadRequestException('Документы уже подписаны или отклонены');
    }
    if (row.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('Превышено число попыток ввода кода');
    }
    if (row.otpExpiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Срок действия кода истёк — запросите новую ссылку у менеджера');
    }

    const ok = sha256Hex(otpCode) === row.otpCodeHash;
    if (!ok) {
      await this.prisma.contractDocumentSigningSession.update({
        where: { id: row.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new BadRequestException('Неверный код подтверждения');
    }

    // Хронология на момент подписания: акты — только после подписанного договора
    // (статус пакета мог измениться после создания ссылки).
    const stageInfo = detectSigningStage(
      (Array.isArray(row.documents) ? row.documents : []) as SigningSessionDocumentMeta[],
    );
    assertSigningChronologyAtSign(stageInfo.stage, row.package.status);

    const updated = await this.prisma.contractDocumentSigningSession.update({
      where: { id: row.id },
      data: {
        status: ContractDocumentSigningSessionStatus.SIGNED,
        signedAt: new Date(),
        viewedAt: row.viewedAt ?? new Date(),
        signedName,
        signedIp: meta.ip?.slice(0, 64) || null,
        signedUserAgent: meta.userAgent?.slice(0, 500) || null,
      },
    });

    const signingMarker = {
      sessionId: updated.id,
      status: updated.status,
      sentAt: updated.createdAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      viewedAt: updated.viewedAt?.toISOString() ?? null,
      signedAt: updated.signedAt?.toISOString() ?? null,
      signedName,
      documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
    };
    const notifySigned = () =>
      this.signingNotify.onSessionEvent('signed', row, row.package.title ?? 'Договор', {
        signedName,
      });

    if (stageInfo.stage === 'CONTRACT') {
      // Подписание договора: заключение (номер, статус, снимок версии, уведомления).
      await this.packageMarker.patch(row.packageId, signingMarker, {
        conclude: true,
        signedName,
      });
      notifySigned();
      await this.runCompletion(updated.id);
      return this.getPublicSession(token);
    }

    if (stageInfo.stage === 'ACT_START' || stageInfo.stage === 'ACT_ACCEPTANCE') {
      // Подписание акта: дата акта + PDF с отметкой ЭП вместо фото, снимок версии.
      await this.stageEffects.applyActEffects({
        packageId: row.packageId,
        stage: stageInfo.stage,
        stageTab: stageInfo.stageTab,
        sessionId: updated.id,
        signedAt: updated.signedAt ?? new Date(),
        signingMarker,
      });
      notifySigned();
      return this.getPublicSession(token);
    }

    if (stageInfo.stage === 'ADDENDUM') {
      // Подписание Д/с: слот отмечается подписанным (как ручной чекбокс в хабе).
      await this.stageEffects.applyAddendumEffects({
        packageId: row.packageId,
        stageTab: stageInfo.stageTab,
        sessionId: updated.id,
        signedAt: updated.signedAt ?? new Date(),
        signingMarker,
        packageFormData: row.package.formData,
      });
      notifySigned();
      await this.runCompletion(updated.id);
      return this.getPublicSession(token);
    }

    // Прочие документы (спецификация, счёт-заказ…): подпись фиксируется,
    // но статус пакета и договора не меняются.
    await this.packageMarker.patch(row.packageId, signingMarker);
    notifySigned();
    await this.runCompletion(updated.id);
    return this.getPublicSession(token);
  }

  /** Финализация комплекта не должна отменять подпись — ошибки только в лог. */
  private async runCompletion(sessionId: string): Promise<void> {
    try {
      await this.completion.finalizeSignedArtifacts(sessionId);
    } catch (err) {
      this.logger.error(
        `Не удалось сформировать подписанный комплект (сессия ${sessionId}): ${(err as Error).message}`,
      );
    }
  }

  async reject(token: string, reason?: string) {
    const row = await this.getByTokenOrThrow(token);
    if (
      row.status !== ContractDocumentSigningSessionStatus.PENDING &&
      row.status !== ContractDocumentSigningSessionStatus.VIEWED
    ) {
      throw new BadRequestException('Сессия уже завершена');
    }
    const updated = await this.prisma.contractDocumentSigningSession.update({
      where: { id: row.id },
      data: {
        status: ContractDocumentSigningSessionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason?.trim() || null,
        viewedAt: row.viewedAt ?? new Date(),
      },
    });
    await this.contractNumbering.releaseHoldsForSession(row.id);
    await this.packageMarker.patch(row.packageId, {
      sessionId: updated.id,
      status: updated.status,
      sentAt: updated.createdAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      viewedAt: updated.viewedAt?.toISOString() ?? null,
      signedAt: null,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
      rejectionReason: updated.rejectionReason,
      documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
    });

    this.signingNotify.onSessionEvent('rejected', row, row.package.title ?? 'Договор', {
      rejectionReason: updated.rejectionReason,
    });

    return this.getPublicSession(token);
  }
}
