import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ContractDocumentPackageKind, type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberAssignmentsService } from './contract-document-number-assignments.service';
import {
  composeContractNumber,
  isSystemContractNumberFormat,
} from './contract-document-number-format';
import { ContractDocumentNumberingService } from './contract-document-numbering.service';

@Injectable()
export class ContractDocumentNumberHoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: ContractDocumentNumberAssignmentsService,
    @Inject(forwardRef(() => ContractDocumentNumberingService))
    private readonly numbering: ContractDocumentNumberingService,
  ) {}

  /**
   * Временный резерв номеров при отправке на ЭП.
   * Обновляет formData пакета и пишет holds; счётчик permanently не двигает.
   */
  async softReserveNumbersForSigning(params: {
    packageId: string;
    sessionId: string;
    kind: ContractDocumentPackageKind;
    formData: unknown;
    expiresAt: Date;
  }): Promise<Record<string, unknown>> {
    await this.releaseActiveHoldsForPackage(params.packageId);

    const root =
      params.formData && typeof params.formData === 'object' && !Array.isArray(params.formData)
        ? { ...(params.formData as Record<string, unknown>) }
        : {};

    const applied = await this.numbering.mapPackageNumbers(params.kind, root, async (slot) => {
      if (!slot.looksLikeSequence && !slot.isEmpty) return null;
      return this.softReserveOne({
        managerUserId: slot.managerUserId,
        surveyorUserId: slot.surveyorUserId,
        officeId: slot.officeId,
        kind: params.kind,
        numberLetterOverride: slot.numberLetterOverride,
        preferredNumber: slot.currentNumber,
        packageId: params.packageId,
        sessionId: params.sessionId,
        expiresAt: params.expiresAt,
      });
    });

    await this.prisma.contractDocumentPackage.update({
      where: { id: params.packageId },
      data: { formData: applied as Prisma.InputJsonValue },
    });
    await this.assignments.syncNumberAssignmentsForPackage(params.packageId, applied);
    return applied;
  }

  /** Снять временный резерв (отмена / отказ / истечение ЭП). */
  async releaseHoldsForSession(sessionId: string): Promise<void> {
    const now = new Date();
    await this.prisma.contractDocumentNumberHold.updateMany({
      where: {
        sessionId,
        releasedAt: null,
        consumedAt: null,
      },
      data: { releasedAt: now },
    });
  }

  async releaseActiveHoldsForPackage(packageId: string): Promise<void> {
    const now = new Date();
    await this.prisma.contractDocumentNumberHold.updateMany({
      where: {
        packageId,
        releasedAt: null,
        consumedAt: null,
      },
      data: { releasedAt: now },
    });
  }

  async softReserveOne(input: {
    managerUserId: string;
    surveyorUserId: string;
    officeId: string;
    kind: ContractDocumentPackageKind;
    numberLetterOverride?: string;
    preferredNumber?: string;
    packageId: string;
    sessionId: string;
    expiresAt: Date;
  }): Promise<string | null> {
    const resolved = await this.numbering.resolveNumberParts(
      {
        managerUserId: input.managerUserId,
        surveyorUserId: input.surveyorUserId,
        officeId: input.officeId,
        kind: input.kind,
        numberLetterOverride: input.numberLetterOverride,
      },
      { soft: true },
    );
    if ('error' in resolved) return null;

    return this.prisma.$transaction(async (tx) => {
      await this.expireStaleHoldsTx(tx, resolved.managerUserId, resolved.directionId);
      const permanent = await this.peekCounterValueTx(
        tx,
        resolved.managerUserId,
        resolved.directionId,
      );
      const now = new Date();
      const holds = await tx.contractDocumentNumberHold.findMany({
        where: {
          managerUserId: resolved.managerUserId,
          directionId: resolved.directionId,
          releasedAt: null,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        select: { sequence: true, packageId: true },
      });
      const occupiedByOthers = new Set(
        holds.filter((h) => h.packageId !== input.packageId).map((h) => h.sequence),
      );

      let sequence: number | null = null;
      const preferred = (input.preferredNumber ?? '').trim();
      if (
        preferred &&
        isSystemContractNumberFormat(preferred, {
          officePrefix: resolved.officePrefix,
          managerCode: resolved.managerCode,
          surveyorCode: resolved.surveyorCode,
          directionLetter: resolved.directionLetter,
        })
      ) {
        const m = preferred.match(/-(\d+)$/);
        const preferredSeq = m ? Number(m[1]) : NaN;
        const preferredTakenElsewhere = await this.assignments.isNumberAssignedToOtherPackage(
          preferred,
          input.packageId,
        );
        if (
          Number.isFinite(preferredSeq) &&
          preferredSeq > permanent &&
          !occupiedByOthers.has(preferredSeq) &&
          !preferredTakenElsewhere
        ) {
          sequence = preferredSeq;
        }
      }
      if (sequence == null) {
        sequence = permanent + 1;
        while (true) {
          if (occupiedByOthers.has(sequence)) {
            sequence += 1;
            continue;
          }
          const candidateNumber = composeContractNumber({
            officePrefix: resolved.officePrefix,
            managerCode: resolved.managerCode,
            surveyorCode: resolved.surveyorCode,
            directionLetter: resolved.directionLetter,
            sequence,
          });
          if (
            await this.assignments.isNumberAssignedToOtherPackage(candidateNumber, input.packageId)
          ) {
            sequence += 1;
            continue;
          }
          break;
        }
      }

      const composedNumber = composeContractNumber({
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
        directionLetter: resolved.directionLetter,
        sequence,
      });
      await tx.contractDocumentNumberHold.create({
        data: {
          managerUserId: resolved.managerUserId,
          directionId: resolved.directionId,
          sequence,
          composedNumber,
          numberLetter: resolved.directionLetter,
          packageId: input.packageId,
          sessionId: input.sessionId,
          expiresAt: input.expiresAt,
        },
      });
      return composedNumber;
    });
  }

  async consumeHoldForPackageNumber(params: {
    packageId: string;
    composedNumber: string;
  }): Promise<string | null> {
    const now = new Date();
    const hold = await this.prisma.contractDocumentNumberHold.findFirst({
      where: {
        packageId: params.packageId,
        composedNumber: params.composedNumber.trim(),
        releasedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!hold) return null;

    await this.prisma.$transaction(async (tx) => {
      await tx.contractDocumentNumberHold.update({
        where: { id: hold.id },
        data: { consumedAt: now },
      });
      const existing = await tx.contractDocumentNumberCounter.findUnique({
        where: {
          managerUserId_directionId: {
            managerUserId: hold.managerUserId,
            directionId: hold.directionId,
          },
        },
      });
      if (!existing) {
        await tx.contractDocumentNumberCounter.create({
          data: {
            managerUserId: hold.managerUserId,
            directionId: hold.directionId,
            value: hold.sequence,
          },
        });
        return;
      }
      if (existing.value < hold.sequence) {
        await tx.contractDocumentNumberCounter.update({
          where: { id: existing.id },
          data: { value: hold.sequence },
        });
      }
    });
    return hold.composedNumber;
  }

  async peekNextAvailableSequence(managerUserId: string, directionId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await this.expireStaleHoldsTx(tx, managerUserId, directionId);
      return this.peekNextAvailableSequenceTx(tx, managerUserId, directionId);
    });
  }

  async peekNextAvailableSequenceTx(
    tx: Prisma.TransactionClient,
    managerUserId: string,
    directionId: string,
  ): Promise<number> {
    const permanent = await this.peekCounterValueTx(tx, managerUserId, directionId);
    const now = new Date();
    const holds = await tx.contractDocumentNumberHold.findMany({
      where: {
        managerUserId,
        directionId,
        releasedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      select: { sequence: true },
    });
    const occupied = new Set(holds.map((h) => h.sequence));
    let candidate = permanent + 1;
    while (occupied.has(candidate)) candidate += 1;
    return candidate;
  }

  async expireStaleHoldsTx(
    tx: Prisma.TransactionClient,
    managerUserId: string,
    directionId: string,
  ): Promise<void> {
    const now = new Date();
    await tx.contractDocumentNumberHold.updateMany({
      where: {
        managerUserId,
        directionId,
        releasedAt: null,
        consumedAt: null,
        expiresAt: { lte: now },
      },
      data: { releasedAt: now },
    });
  }

  private async peekCounterValueTx(
    tx: Prisma.TransactionClient | PrismaService,
    managerUserId: string,
    directionId: string,
  ): Promise<number> {
    const row = await tx.contractDocumentNumberCounter.findUnique({
      where: {
        managerUserId_directionId: { managerUserId, directionId },
      },
      select: { value: true },
    });
    return row?.value ?? 0;
  }
}
