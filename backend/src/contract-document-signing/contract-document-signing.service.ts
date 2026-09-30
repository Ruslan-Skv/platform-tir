import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import {
  ContractDocumentPackageKind,
  ContractDocumentSigningSessionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberingService } from '../contract-document-numbering/contract-document-numbering.service';
import { SigningStampService } from './finalize/signing-stamp.service';
import { SigningPackageMarkerService } from './signing-package-marker.service';
import { managerDisplayName, resolveContractorInfo } from './signing-contractor-info';
import { sendSigningOtpEmail } from './signing-emails';
import { detectSigningStage, validateSigningStageCreation } from './signing-stage';
import { SigningStageEffectsService } from './signing-stage-effects.service';
import {
  buildSignUrl,
  normalizePaymentQrs,
  randomOtpCode,
  randomSessionToken,
  sha256Hex,
  signingSiteUrl,
  toSigningSessionAdminDto,
} from './signing-session-dto';
import { type SigningSessionDocumentMeta } from './signing-session-documents';

export type { SigningSessionDocumentMeta } from './signing-session-documents';

const OTP_TTL_MINUTES = 60 * 24 * 7; // same window as session default; refreshed on create
const DEFAULT_SESSION_DAYS = 7;

/** Прикреплена ли к пакету смета (расчёт): estimate.selectedPresetId / selectedPresetIds. */
function hasAttachedRepairEstimate(formData: unknown): boolean {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return false;
  const est = (formData as Record<string, unknown>).estimate;
  if (!est || typeof est !== 'object') return false;
  const e = est as Record<string, unknown>;
  if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) return true;
  if (Array.isArray(e.selectedPresetIds)) {
    return e.selectedPresetIds.some((x) => typeof x === 'string' && x.trim().length > 0);
  }
  return false;
}

/**
 * Админовый поток сессий ЭП: создание (штамп Подрядчика, письмо с OTP, нумерация),
 * список, отзыв. Публичная страница /sign/<token> — ContractDocumentSigningPublicService.
 */
@Injectable()
export class ContractDocumentSigningService {
  private readonly logger = new Logger(ContractDocumentSigningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
    private readonly contractNumbering: ContractDocumentNumberingService,
    private readonly packageMarker: SigningPackageMarkerService,
    private readonly stamp: SigningStampService,
    private readonly stageEffects: SigningStageEffectsService,
  ) {}

  buildSignUrl(token: string): string {
    return buildSignUrl(signingSiteUrl(this.config), token);
  }

  /**
   * Можно ли создавать сессию ЭП для пакета: договор «Ремонт» — только с прикреплённой
   * сметой; состав документов — по правилам этапов (не более одного этапного документа,
   * хронология «сначала договор, затем акты», без повторного подписания).
   */
  async assertCanCreateSigningSession(
    packageId: string,
    documents?: Array<{ tabId: string }>,
  ): Promise<void> {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: packageId, deletedAt: null },
    });
    if (!pkg) throw new NotFoundException('Пакет документов не найден');
    if (
      pkg.kind === ContractDocumentPackageKind.REPAIR &&
      !hasAttachedRepairEstimate(pkg.formData)
    ) {
      throw new BadRequestException(
        'Договор «Ремонт» нельзя отправить на подписание без прикреплённой сметы (расчёта)',
      );
    }
    if (documents?.length) {
      const stageInfo = detectSigningStage(documents);
      validateSigningStageCreation({
        stage: stageInfo.stage,
        stageTabs: stageInfo.stageTabs,
        kind: pkg.kind,
        status: pkg.status,
        formData: pkg.formData,
      });
    }
  }

  async createSession(input: {
    packageId: string;
    createdById: string | null;
    documents: SigningSessionDocumentMeta[];
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    managerNote?: string | null;
    expiresInDays?: number;
    sendEmail?: boolean;
    contractorLabel?: string | null;
    contractorSignatory?: string | null;
    /** QR-коды для оплаты (до 2) из карточки исполнителя; показываются заказчику на странице подписания. */
    paymentQrs?: Array<{ url: string; title?: string | null }> | null;
  }) {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: input.packageId, deletedAt: null },
    });
    if (!pkg) throw new NotFoundException('Пакет документов не найден');

    // Договор «Ремонт» без сметы нельзя подписать — блокируем уже на этапе создания сессии ЭП.
    if (
      pkg.kind === ContractDocumentPackageKind.REPAIR &&
      !hasAttachedRepairEstimate(pkg.formData)
    ) {
      throw new BadRequestException(
        'Договор «Ремонт» нельзя отправить на подписание без прикреплённой сметы (расчёта)',
      );
    }

    // Правила этапов: один этапный документ на сессию, хронология «сначала договор, затем акты».
    const stageInfo = detectSigningStage(input.documents);
    validateSigningStageCreation({
      stage: stageInfo.stage,
      stageTabs: stageInfo.stageTabs,
      kind: pkg.kind,
      status: pkg.status,
      formData: pkg.formData,
    });

    // Cancel previous active sessions for this package and release their number holds
    const previousActive = await this.prisma.contractDocumentSigningSession.findMany({
      where: {
        packageId: input.packageId,
        status: {
          in: [
            ContractDocumentSigningSessionStatus.PENDING,
            ContractDocumentSigningSessionStatus.VIEWED,
          ],
        },
      },
      select: { id: true },
    });
    if (previousActive.length > 0) {
      await this.prisma.contractDocumentSigningSession.updateMany({
        where: { id: { in: previousActive.map((s) => s.id) } },
        data: { status: ContractDocumentSigningSessionStatus.CANCELLED },
      });
      for (const s of previousActive) {
        await this.contractNumbering.releaseHoldsForSession(s.id);
      }
    }

    const token = randomSessionToken();
    const otpCode = randomOtpCode();
    const days =
      Number.isFinite(input.expiresInDays) && (input.expiresInDays as number) > 0
        ? Math.min(30, Math.floor(input.expiresInDays as number))
        : DEFAULT_SESSION_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const { contractorLabel, contractorSignatory } = await resolveContractorInfo(
      this.prisma,
      pkg.kind,
      {
        contractorLabel: input.contractorLabel,
        contractorSignatory: input.contractorSignatory,
      },
    );
    const managerName = await managerDisplayName(this.prisma, input.createdById);

    const session = await this.prisma.contractDocumentSigningSession.create({
      data: {
        packageId: input.packageId,
        token,
        status: ContractDocumentSigningSessionStatus.PENDING,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        customerEmail: input.customerEmail?.trim() || null,
        documents: input.documents as unknown as Prisma.InputJsonValue,
        managerNote: input.managerNote?.trim() || null,
        otpCodeHash: sha256Hex(otpCode),
        otpExpiresAt,
        expiresAt,
        contractorLabel,
        contractorSignatory,
        paymentQrs: normalizePaymentQrs(input.paymentQrs) as unknown as Prisma.InputJsonValue,
        createdById: input.createdById,
      },
    });

    // Штамп ПЭП Подрядчика на отправляемых PDF + фиксация SHA-256 состава документов.
    // Ошибка штамповки не должна ломать отправку — документы уйдут без отметки.
    let documents = input.documents;
    try {
      documents = await this.stamp.applyContractorStamps(input.documents, {
        sessionId: session.id,
        contractorLabel,
        contractorSignatory,
        managerName,
        sentAt: session.createdAt,
        siteUrl: signingSiteUrl(this.config),
      });
      await this.prisma.contractDocumentSigningSession.update({
        where: { id: session.id },
        data: { documents: documents as unknown as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.error(
        `Штамп Подрядчика не проставлен (сессия ${session.id}): ${(err as Error).message}`,
      );
    }

    try {
      await this.contractNumbering.softReserveNumbersForSigning({
        packageId: input.packageId,
        sessionId: session.id,
        kind: pkg.kind,
        formData: pkg.formData,
        expiresAt,
      });
    } catch {
      /* без кодов нумерации сессия всё равно создаётся */
    }

    const signUrl = this.buildSignUrl(token);
    await this.packageMarker.patch(input.packageId, {
      sessionId: session.id,
      status: session.status,
      sentAt: session.createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      signedAt: null,
      documentCount: documents.length,
    });

    let emailSent = false;
    if (input.sendEmail && session.customerEmail) {
      emailSent = await sendSigningOtpEmail(this.mailer, this.config, {
        to: session.customerEmail,
        customerName: session.customerName,
        signUrl,
        otpCode,
        expiresAt,
        documentLabels: documents.map((d) => d.label),
      });
    }

    return {
      id: session.id,
      token,
      signUrl,
      otpCode,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      customerName: session.customerName,
      documents,
      emailSent,
    };
  }

  async listForPackage(packageId: string) {
    const rows = await this.prisma.contractDocumentSigningSession.findMany({
      where: { packageId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((row) => this.toAdminDto(row));
  }

  private toAdminDto(row: Parameters<typeof toSigningSessionAdminDto>[0]) {
    return toSigningSessionAdminDto(row, this.buildSignUrl(row.token));
  }

  async cancelSession(packageId: string, sessionId: string) {
    const row = await this.prisma.contractDocumentSigningSession.findFirst({
      where: { id: sessionId, packageId },
    });
    if (!row) throw new NotFoundException('Сессия не найдена');
    if (
      row.status !== ContractDocumentSigningSessionStatus.PENDING &&
      row.status !== ContractDocumentSigningSessionStatus.VIEWED
    ) {
      throw new BadRequestException('Нельзя отменить завершённую сессию');
    }
    const updated = await this.prisma.contractDocumentSigningSession.update({
      where: { id: sessionId },
      data: { status: ContractDocumentSigningSessionStatus.CANCELLED },
    });
    await this.contractNumbering.releaseHoldsForSession(sessionId);
    await this.packageMarker.patch(packageId, {
      sessionId: updated.id,
      status: updated.status,
      sentAt: updated.createdAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      signedAt: null,
      documentCount: Array.isArray(updated.documents) ? updated.documents.length : 0,
    });
    return this.toAdminDto(updated);
  }

  /**
   * Договор подписан вручную (не через ЭП): активные сессии ЭП отзываем,
   * маркер `_remoteSigning` затираем — чтобы в списке договоров не висело
   * «На согласовании» рядом со статусом «Подписан».
   */
  cancelActiveSessionsOnManualConclusion(packageId: string): Promise<number> {
    return this.stageEffects.cancelActiveSessionsOnManualConclusion(packageId);
  }
}
