import { Injectable, Logger } from '@nestjs/common';
import { ContractDocumentSigningSessionStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberingService } from '../contract-document-numbering/contract-document-numbering.service';
import { SigningCompletionService } from './finalize/signing-completion.service';
import { SigningPackageMarkerService } from './signing-package-marker.service';
import { addendumOrdinalFromTab } from './signing-stage';

/** Дата подписания акта (YYYY-MM-DD) по московскому времени. */
function moscowDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(date);
}

/**
 * Побочные эффекты подписания по этапам (кроме заключения договора):
 * отметки актов и доп. соглашений в formData пакета, а также отзыв активных
 * сессий ЭП при ручном подписании договора. Подпись уже зафиксирована —
 * ошибка эффектов не отменяет её (комплект можно (пере)сформировать из админки).
 */
@Injectable()
export class SigningStageEffectsService {
  private readonly logger = new Logger(SigningStageEffectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractNumbering: ContractDocumentNumberingService,
    private readonly marker: SigningPackageMarkerService,
    private readonly completion: SigningCompletionService,
  ) {}

  /**
   * Договор подписан вручную (не через ЭП): активные сессии ЭП отзываем,
   * маркер `_remoteSigning` затираем — чтобы в списке договоров не висело
   * «На согласовании» рядом со статусом «Подписан».
   */
  async cancelActiveSessionsOnManualConclusion(packageId: string): Promise<number> {
    const active = await this.prisma.contractDocumentSigningSession.findMany({
      where: {
        packageId,
        status: {
          in: [
            ContractDocumentSigningSessionStatus.PENDING,
            ContractDocumentSigningSessionStatus.VIEWED,
          ],
        },
      },
      select: { id: true },
    });
    if (active.length > 0) {
      await this.prisma.contractDocumentSigningSession.updateMany({
        where: { id: { in: active.map((s) => s.id) } },
        data: { status: ContractDocumentSigningSessionStatus.CANCELLED },
      });
      for (const s of active) {
        await this.contractNumbering.releaseHoldsForSession(s.id);
      }
    }
    await this.marker.clearRemoteSigningMarker(packageId);
    return active.length;
  }

  /**
   * Подписание акта: сначала подписанные копии (нужен PDF акта с отметкой ЭП),
   * затем отметки в formData — дата акта и файл вместо фото.
   */
  async applyActEffects(input: {
    packageId: string;
    stage: 'ACT_START' | 'ACT_ACCEPTANCE';
    stageTab: string | null;
    sessionId: string;
    signedAt: Date;
    signingMarker: Record<string, unknown>;
  }): Promise<void> {
    let actProofUrl: string | null = null;
    try {
      const artifacts = await this.completion.finalizeSignedArtifacts(input.sessionId);
      if (artifacts) {
        actProofUrl =
          artifacts.documents.find((d) => d.tabId === input.stageTab)?.signedFileUrl ??
          artifacts.signedPackageUrl;
      }
    } catch (err) {
      this.logger.error(
        `Не удалось сформировать подписанный комплект (сессия ${input.sessionId}): ${(err as Error).message}`,
      );
    }
    const actDate = moscowDateOnly(input.signedAt);
    const extraFormFields =
      input.stage === 'ACT_START'
        ? {
            repairWorkStartActSignedAt: actDate,
            ...(actProofUrl ? { repairWorkStartActPhotoUrl: actProofUrl } : {}),
          }
        : {
            repairContractCloseActSignedAt: actDate,
            ...(actProofUrl ? { repairContractCloseActPhotoUrl: actProofUrl } : {}),
            repairContractClosed: true,
            contractClosed: true,
          };
    await this.marker.patch(input.packageId, input.signingMarker, {
      extraFormFields,
      recordVersion: true,
    });
  }

  /**
   * Подписание Д/с: слоту выставляется SIGNED с датой ЭП-подписи — та же отметка,
   * что и ручной чекбокс «Д/с №… подписано» в хабе. Если слот уже не OPEN
   * (отмечен вручную за время жизни ссылки) — отметка не перезаписывается.
   */
  async applyAddendumEffects(input: {
    packageId: string;
    stageTab: string | null;
    sessionId: string;
    signedAt: Date;
    signingMarker: Record<string, unknown>;
    packageFormData: unknown;
  }): Promise<void> {
    const ordinal = addendumOrdinalFromTab(input.stageTab);
    const pkgForm =
      input.packageFormData &&
      typeof input.packageFormData === 'object' &&
      !Array.isArray(input.packageFormData)
        ? { ...(input.packageFormData as Record<string, unknown>) }
        : {};
    const slots = Array.isArray(pkgForm.addendumSlots)
      ? [...(pkgForm.addendumSlots as unknown[])]
      : [];
    const slotIndex = (ordinal ?? 0) - 1;
    const slot = slots[slotIndex];
    if (
      slot &&
      typeof slot === 'object' &&
      !Array.isArray(slot) &&
      (slot as Record<string, unknown>).status === 'OPEN'
    ) {
      slots[slotIndex] = {
        ...slot,
        status: 'SIGNED',
        signedAt: input.signedAt.toISOString(),
        paidAt: '',
      };
      await this.marker.patch(input.packageId, input.signingMarker, {
        extraFormFields: { addendumSlots: slots },
        recordVersion: true,
      });
      return;
    }
    this.logger.warn(
      `Слот Д/с №${ordinal} уже не в статусе OPEN — отметка не перезаписана (сессия ${input.sessionId})`,
    );
    await this.marker.patch(input.packageId, input.signingMarker);
  }
}
