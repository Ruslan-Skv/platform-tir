import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { ContractDocumentPackageKind, type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberAssignmentsService } from './contract-document-number-assignments.service';
import {
  composeContractNumber,
  isSystemContractNumberFormat,
  parseSystemContractNumber,
} from './contract-document-number-format';
import { ContractDocumentNumberingService } from './contract-document-numbering.service';

/** Срок ручной брони номера («Забронировать номер») — 5 суток. */
export const MANUAL_NUMBER_HOLD_DAYS = 5;

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
    /** Сессия ЭП; null — ручная бронь менеджером. */
    sessionId: string | null;
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
        // Выбранный/забронированный номер сохраняем, пока его не забрал другой
        // договор (реестр номеров или чужой резерв ЭП); позиция постоянного
        // счётчика значения не имеет — номер остаётся за этим пакетом.
        if (
          Number.isFinite(preferredSeq) &&
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
      await this.settleCounterForSequence(hold.managerUserId, hold.directionId, hold.sequence, tx);
    });
    return hold.composedNumber;
  }

  async peekNextAvailableSequence(
    managerUserId: string,
    directionId: string,
    excludePackageId?: string | null,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await this.expireStaleHoldsTx(tx, managerUserId, directionId);
      return this.peekNextAvailableSequenceTx(tx, managerUserId, directionId, excludePackageId);
    });
  }

  async peekNextAvailableSequenceTx(
    tx: Prisma.TransactionClient,
    managerUserId: string,
    directionId: string,
    excludePackageId?: string | null,
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
        // Резервы самого пакета не мешают его же рекомендации (свой забронированный номер).
        ...(excludePackageId ? { packageId: { not: excludePackageId } } : {}),
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

  /** Поднимает постоянный счётчик до sequence (не понижая его). */
  async settleCounterForSequence(
    managerUserId: string,
    directionId: string,
    sequence: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!Number.isFinite(sequence) || sequence <= 0) return;
    const client = tx ?? this.prisma;
    const existing = await client.contractDocumentNumberCounter.findUnique({
      where: { managerUserId_directionId: { managerUserId, directionId } },
    });
    if (!existing) {
      await client.contractDocumentNumberCounter.create({
        data: { managerUserId, directionId, value: sequence },
      });
      return;
    }
    if (existing.value < sequence) {
      await client.contractDocumentNumberCounter.update({
        where: { id: existing.id },
        data: { value: sequence },
      });
    }
  }

  /** Занят ли порядковый номер активным резервом другого пакета. */
  async isSequenceHeldByOther(params: {
    managerUserId: string;
    directionId: string;
    sequence: number;
    excludePackageId?: string | null;
  }): Promise<boolean> {
    const now = new Date();
    const hold = await this.prisma.contractDocumentNumberHold.findFirst({
      where: {
        managerUserId: params.managerUserId,
        directionId: params.directionId,
        sequence: params.sequence,
        releasedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
        ...(params.excludePackageId ? { packageId: { not: params.excludePackageId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(hold);
  }

  /**
   * Номера нет в форме (устаревшая форма редактора), но за пакетом стоит
   * активный резерв ЭП для этой буквы — поглощаем резерв и возвращаем его номер.
   */
  async consumeOwnHoldForSlot(input: {
    packageId: string;
    managerUserId: string;
    surveyorUserId: string;
    officeId: string;
    kind: ContractDocumentPackageKind;
    numberLetterOverride?: string;
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

    const now = new Date();
    const hold = await this.prisma.contractDocumentNumberHold.findFirst({
      where: {
        packageId: input.packageId,
        managerUserId: resolved.managerUserId,
        directionId: resolved.directionId,
        numberLetter: resolved.directionLetter,
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
      await this.settleCounterForSequence(hold.managerUserId, hold.directionId, hold.sequence, tx);
    });
    return hold.composedNumber;
  }

  /**
   * Ручная бронь номеров за пакетом (кнопка «Забронировать номер»): 5 суток,
   * без сессии ЭП. Бронируются ровно те номера, что выбраны в форме; если
   * какой-то из них занят другим договором — бронь не создаётся вовсе.
   * Повторный клик продлевает бронь / переключает её на новые номера.
   */
  async manualReserveNumbers(input: {
    packageId: string;
    managerUserId: string;
    surveyorUserId: string;
    officeId: string;
    numbers: string[];
  }): Promise<Array<{ number: string; expiresAt: Date }>> {
    const pkg = await this.prisma.contractDocumentPackage.findFirst({
      where: { id: input.packageId, deletedAt: null },
      select: { kind: true },
    });
    if (!pkg) throw new BadRequestException('Пакет документов не найден');

    const resolved = await this.numbering.resolveNumberParts(
      {
        managerUserId: input.managerUserId,
        surveyorUserId: input.surveyorUserId,
        officeId: input.officeId,
        kind: pkg.kind,
      },
      { soft: false },
    );
    if ('error' in resolved) throw new BadRequestException(resolved.error);

    const allowedLetters = new Set<string>(
      pkg.kind === ContractDocumentPackageKind.FURNITURE
        ? ['м', 'с', 'т']
        : [resolved.directionLetter],
    );

    const parsed = new Map<string, { letter: string; sequence: number }>();
    for (const raw of input.numbers) {
      const number = raw.trim();
      if (!number || parsed.has(number)) continue;
      const p = parseSystemContractNumber(number, {
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
      });
      if (!p || !allowedLetters.has(p.directionLetter)) {
        throw new BadRequestException(
          `Номер «${number}» не подходит для нумерации ` +
            `(${resolved.officePrefix}${resolved.managerCode}${resolved.surveyorCode}` +
            `${[...allowedLetters].join('/')}-N).`,
        );
      }
      parsed.set(number, { letter: p.directionLetter, sequence: p.sequence });
    }
    if (parsed.size === 0) {
      throw new BadRequestException(
        'Нет номеров для бронирования — сначала выберите номер договора.',
      );
    }

    const expiresAt = new Date(Date.now() + MANUAL_NUMBER_HOLD_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await this.expireStaleHoldsTx(tx, resolved.managerUserId, resolved.directionId);

      for (const [number, item] of parsed) {
        const takenElsewhere = await this.assignments.isNumberAssignedToOtherPackage(
          number,
          input.packageId,
        );
        if (takenElsewhere) {
          throw new BadRequestException(
            `Номер «${number}» уже используется другим договором. Выберите другой номер.`,
          );
        }
        const heldByOther = await tx.contractDocumentNumberHold.findFirst({
          where: {
            managerUserId: resolved.managerUserId,
            directionId: resolved.directionId,
            sequence: item.sequence,
            releasedAt: null,
            consumedAt: null,
            expiresAt: { gt: now },
            packageId: { not: input.packageId },
          },
          select: { id: true },
        });
        if (heldByOther) {
          throw new BadRequestException(
            `Номер «${number}» временно забронирован другим договором. Выберите другой номер.`,
          );
        }
      }

      // Прежняя ручная бронь пакета снимается — номера могли измениться.
      await tx.contractDocumentNumberHold.updateMany({
        where: {
          packageId: input.packageId,
          sessionId: null,
          releasedAt: null,
          consumedAt: null,
        },
        data: { releasedAt: now },
      });

      for (const [number, item] of parsed) {
        const own = await tx.contractDocumentNumberHold.findFirst({
          where: {
            packageId: input.packageId,
            composedNumber: number,
            releasedAt: null,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (own) {
          // Резерв сессии ЭП на этот номер — продлеваем его же.
          await tx.contractDocumentNumberHold.update({
            where: { id: own.id },
            data: { expiresAt },
          });
          continue;
        }
        await tx.contractDocumentNumberHold.create({
          data: {
            managerUserId: resolved.managerUserId,
            directionId: resolved.directionId,
            sequence: item.sequence,
            composedNumber: number,
            numberLetter: item.letter,
            packageId: input.packageId,
            sessionId: null,
            expiresAt,
          },
        });
      }
    });

    return [...parsed.keys()].map((number) => ({ number, expiresAt }));
  }

  /** Активные резервы номеров пакета (ручная бронь и бронь сессий ЭП). */
  async listActiveHoldsForPackage(
    packageId: string,
  ): Promise<Array<{ number: string; expiresAt: Date; source: 'manual' | 'signing' }>> {
    const now = new Date();
    const rows = await this.prisma.contractDocumentNumberHold.findMany({
      where: {
        packageId,
        releasedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      number: row.composedNumber,
      expiresAt: row.expiresAt,
      source: row.sessionId ? ('signing' as const) : ('manual' as const),
    }));
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
