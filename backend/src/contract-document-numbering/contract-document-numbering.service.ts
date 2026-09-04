import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ContractDocumentPackageKind, type Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ContractDocumentNumberAssignmentsService } from './contract-document-number-assignments.service';
import {
  PACKAGE_KIND_DIRECTION_SLUG,
  composeContractNumber,
  emptyPreviewErrorResult,
  formatContractNumberUserName,
  isSystemContractNumberFormat,
  type ContractNumberParts,
  type ContractNumberPreviewInput,
  type ContractNumberPreviewResult,
  type ContractNumberResolveError,
} from './contract-document-number-format';
import { ContractDocumentNumberHoldsService } from './contract-document-number-holds.service';

export type {
  ContractNumberParts,
  ContractNumberPreviewInput,
  ContractNumberPreviewResult,
} from './contract-document-number-format';
export {
  PACKAGE_KIND_DIRECTION_SLUG,
  composeContractNumber,
  isSystemContractNumberFormat,
} from './contract-document-number-format';

@Injectable()
export class ContractDocumentNumberingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: ContractDocumentNumberAssignmentsService,
    @Inject(forwardRef(() => ContractDocumentNumberHoldsService))
    private readonly holds: ContractDocumentNumberHoldsService,
  ) {}

  /** Preview: всегда 200 с ok/error — не засоряет консоль при незаполненных кодах. */
  async preview(input: ContractNumberPreviewInput): Promise<ContractNumberPreviewResult> {
    const resolved = await this.resolveNumberParts(input, { soft: true });
    if ('error' in resolved) {
      return emptyPreviewErrorResult(resolved);
    }

    const nextSequence = await this.holds.peekNextAvailableSequence(
      resolved.managerUserId,
      resolved.directionId,
    );
    let sequence = nextSequence;
    let recommendedNumber = composeContractNumber({
      officePrefix: resolved.officePrefix,
      managerCode: resolved.managerCode,
      surveyorCode: resolved.surveyorCode,
      directionLetter: resolved.directionLetter,
      sequence,
    });
    // Пропускаем номера, уже занятые любым пакетом (в т.ч. своим черновиком с ручным вводом).
    for (let guard = 0; guard < 500; guard += 1) {
      const taken = await this.assignments.isNumberAssignedToOtherPackage(recommendedNumber, null);
      if (!taken) break;
      sequence += 1;
      recommendedNumber = composeContractNumber({
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
        directionLetter: resolved.directionLetter,
        sequence,
      });
    }
    return {
      ok: true,
      recommendedNumber,
      nextSequence: sequence,
      error: null,
      officePrefix: resolved.officePrefix,
      managerCode: resolved.managerCode,
      surveyorCode: resolved.surveyorCode,
      directionLetter: resolved.directionLetter,
      directionId: resolved.directionId,
      directionName: resolved.directionName,
      officeName: resolved.officeName,
      managerName: resolved.managerName,
      surveyorName: resolved.surveyorName,
    };
  }

  async allocate(input: ContractNumberPreviewInput): Promise<ContractNumberPreviewResult> {
    const resolved = await this.resolveNumberParts(input, { soft: false });
    if ('error' in resolved) {
      throw new BadRequestException(resolved.error);
    }
    const sequence = await this.allocateSequence(resolved.managerUserId, resolved.directionId);
    return {
      ok: true,
      recommendedNumber: composeContractNumber({
        officePrefix: resolved.officePrefix,
        managerCode: resolved.managerCode,
        surveyorCode: resolved.surveyorCode,
        directionLetter: resolved.directionLetter,
        sequence,
      }),
      nextSequence: sequence,
      error: null,
      officePrefix: resolved.officePrefix,
      managerCode: resolved.managerCode,
      surveyorCode: resolved.surveyorCode,
      directionLetter: resolved.directionLetter,
      directionId: resolved.directionId,
      directionName: resolved.directionName,
      officeName: resolved.officeName,
      managerName: resolved.managerName,
      surveyorName: resolved.surveyorName,
    };
  }

  softReserveNumbersForSigning(params: {
    packageId: string;
    sessionId: string;
    kind: ContractDocumentPackageKind;
    formData: unknown;
    expiresAt: Date;
  }): Promise<Record<string, unknown>> {
    return this.holds.softReserveNumbersForSigning(params);
  }

  releaseHoldsForSession(sessionId: string): Promise<void> {
    return this.holds.releaseHoldsForSession(sessionId);
  }

  releaseActiveHoldsForPackage(packageId: string): Promise<void> {
    return this.holds.releaseActiveHoldsForPackage(packageId);
  }

  syncNumberAssignmentsForPackage(packageId: string, formData: unknown): Promise<void> {
    return this.assignments.syncNumberAssignmentsForPackage(packageId, formData);
  }

  releaseNumberAssignmentsForPackage(packageId: string): Promise<void> {
    return this.assignments.releaseNumberAssignmentsForPackage(packageId);
  }

  isNumberAssignedToOtherPackage(
    number: string,
    excludePackageId?: string | null,
  ): Promise<boolean> {
    return this.assignments.isNumberAssignedToOtherPackage(number, excludePackageId);
  }

  /**
   * При «Договор подписан»: если есть soft-hold ЭП — закрепляет его;
   * иначе резервирует новый порядковый номер. Свой номер не трогает.
   */
  async finalizeFormDataNumbersOnConclude(
    kind: ContractDocumentPackageKind,
    formData: unknown,
    packageId?: string | null,
  ): Promise<Record<string, unknown>> {
    const root =
      formData && typeof formData === 'object' && !Array.isArray(formData)
        ? { ...(formData as Record<string, unknown>) }
        : {};

    return this.mapPackageNumbers(kind, root, async (slot) => {
      if (!slot.looksLikeSequence && !slot.isEmpty) return null;

      if (packageId && slot.currentNumber) {
        const consumed = await this.holds.consumeHoldForPackageNumber({
          packageId,
          composedNumber: slot.currentNumber,
        });
        if (consumed) return consumed;
      }

      return this.allocateIfSequenceOrEmpty({
        managerUserId: slot.managerUserId,
        surveyorUserId: slot.surveyorUserId,
        officeId: slot.officeId,
        kind,
        numberLetterOverride: slot.numberLetterOverride,
        currentNumber: slot.currentNumber,
      });
    });
  }

  async mapPackageNumbers(
    kind: ContractDocumentPackageKind,
    root: Record<string, unknown>,
    apply: (slot: {
      managerUserId: string;
      surveyorUserId: string;
      officeId: string;
      currentNumber: string;
      isEmpty: boolean;
      looksLikeSequence: boolean;
      numberLetterOverride?: string;
    }) => Promise<string | null>,
  ): Promise<Record<string, unknown>> {
    const contract =
      root.contract && typeof root.contract === 'object' && !Array.isArray(root.contract)
        ? { ...(root.contract as Record<string, unknown>) }
        : {};
    const executor =
      root.executor && typeof root.executor === 'object' && !Array.isArray(root.executor)
        ? (root.executor as Record<string, unknown>)
        : {};

    const managerUserId =
      typeof executor.signatoryCrmUserId === 'string' ? executor.signatoryCrmUserId.trim() : '';
    const officeId = typeof contract.officeId === 'string' ? contract.officeId.trim() : '';
    const surveyorUserId =
      typeof contract.surveyorUserId === 'string' ? contract.surveyorUserId.trim() : '';

    if (!managerUserId || !officeId || !surveyorUserId) {
      return root;
    }

    const buildLooksLike = async (current: string, letter?: string) => {
      const preview = await this.preview({
        managerUserId,
        surveyorUserId,
        officeId,
        kind,
        numberLetterOverride: letter,
      });
      if (!preview.ok) return false;
      return isSystemContractNumberFormat(current, {
        officePrefix: preview.officePrefix ?? '',
        managerCode: preview.managerCode ?? '',
        surveyorCode: preview.surveyorCode ?? '',
        directionLetter: preview.directionLetter ?? '',
      });
    };

    if (kind === ContractDocumentPackageKind.FURNITURE) {
      const furnitureRaw =
        root.furniture && typeof root.furniture === 'object' && !Array.isArray(root.furniture)
          ? { ...(root.furniture as Record<string, unknown>) }
          : null;
      if (!furnitureRaw) return root;

      const legLetters: Array<{ key: 'manufacture' | 'montage' | 'appliances'; letter: string }> = [
        { key: 'manufacture', letter: 'м' },
        { key: 'montage', letter: 'с' },
        { key: 'appliances', letter: 'т' },
      ];

      for (const { key, letter } of legLetters) {
        const legRaw = furnitureRaw[key];
        if (!legRaw || typeof legRaw !== 'object' || Array.isArray(legRaw)) continue;
        const leg = { ...(legRaw as Record<string, unknown>) };
        const enabled = key === 'manufacture' ? true : leg.enabled === true;
        if (!enabled) continue;

        const legContract =
          leg.contract && typeof leg.contract === 'object' && !Array.isArray(leg.contract)
            ? { ...(leg.contract as Record<string, unknown>) }
            : {};
        const current =
          typeof legContract.number === 'string'
            ? legContract.number.trim()
            : key === 'manufacture' && typeof contract.number === 'string'
              ? contract.number.trim()
              : '';
        const isEmpty = !current;
        const looksLikeSequence = isEmpty ? false : await buildLooksLike(current, letter);
        const nextNumber = await apply({
          managerUserId,
          surveyorUserId,
          officeId,
          currentNumber: current,
          isEmpty,
          looksLikeSequence,
          numberLetterOverride: letter,
        });
        if (nextNumber == null) continue;

        legContract.number = nextNumber;
        leg.contract = legContract;
        furnitureRaw[key] = leg;
        if (key === 'manufacture') {
          contract.number = nextNumber;
        }
      }

      root.furniture = furnitureRaw;
      root.contract = contract;
      return root;
    }

    const current = typeof contract.number === 'string' ? contract.number.trim() : '';
    const isEmpty = !current;
    const looksLikeSequence = isEmpty ? false : await buildLooksLike(current);
    const nextNumber = await apply({
      managerUserId,
      surveyorUserId,
      officeId,
      currentNumber: current,
      isEmpty,
      looksLikeSequence,
    });
    if (nextNumber != null) {
      contract.number = nextNumber;
      root.contract = contract;
    }
    return root;
  }

  async resolveNumberParts(
    input: ContractNumberPreviewInput,
    opts: { soft: boolean },
  ): Promise<ContractNumberParts | ContractNumberResolveError> {
    const managerUserId = input.managerUserId?.trim();
    const surveyorUserId = input.surveyorUserId?.trim();
    const officeId = input.officeId?.trim();
    if (!managerUserId) throw new BadRequestException('Укажите менеджера');
    if (!surveyorUserId) throw new BadRequestException('Укажите замерщика');
    if (!officeId) throw new BadRequestException('Укажите офис заключения');
    if (!input.kind) throw new BadRequestException('Укажите направление договора');

    const slug = PACKAGE_KIND_DIRECTION_SLUG[input.kind];
    if (!slug) throw new BadRequestException('Неизвестное направление пакета');

    const [manager, surveyor, office, direction] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: managerUserId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: surveyorUserId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      }),
      this.prisma.office.findUnique({
        where: { id: officeId },
        select: { id: true, name: true, prefix: true, isActive: true },
      }),
      this.prisma.crmDirection.findUnique({
        where: { slug },
        select: { id: true, name: true, numberLetter: true, isActive: true },
      }),
    ]);

    if (!manager) throw new NotFoundException('Менеджер не найден');
    if (!surveyor) throw new NotFoundException('Замерщик не найден');
    if (!office) throw new NotFoundException('Офис не найден');
    if (!direction) throw new NotFoundException(`Направление CRM «${slug}» не найдено`);

    const officePrefix = office.prefix?.trim() ?? '';
    const managerCode = manager.employeeCode?.trim() ?? '';
    const surveyorCode = surveyor.employeeCode?.trim() ?? '';
    const overrideLetter = input.numberLetterOverride?.trim() ?? '';
    const directionLetter = overrideLetter || direction.numberLetter?.trim() || '';
    const managerName = formatContractNumberUserName(manager);
    const surveyorName = formatContractNumberUserName(surveyor);

    const issues: string[] = [];
    if (!officePrefix) {
      issues.push(`У офиса «${office.name}» не задан префикс для нумерации договоров`);
    }
    if (!managerCode) {
      issues.push(`У менеджера ${managerName} не задан код сотрудника для нумерации`);
    }
    if (!surveyorCode) {
      issues.push(`У замерщика ${surveyorName} не задан код сотрудника для нумерации`);
    }
    if (!directionLetter) {
      issues.push(`У направления «${direction.name}» не задана буква в номере договора`);
    }

    if (issues.length > 0) {
      const error = issues.join('. ');
      if (!opts.soft) {
        throw new BadRequestException(error);
      }
      return {
        error,
        officePrefix: officePrefix || null,
        managerCode: managerCode || null,
        surveyorCode: surveyorCode || null,
        directionLetter: directionLetter || null,
        directionId: direction.id,
        directionName: direction.name,
        officeName: office.name,
        managerName,
        surveyorName,
      };
    }

    return {
      managerUserId: manager.id,
      directionId: direction.id,
      directionName: direction.name,
      officePrefix,
      managerCode,
      surveyorCode,
      directionLetter,
      officeName: office.name,
      managerName,
      surveyorName,
    };
  }

  private async allocateIfSequenceOrEmpty(input: {
    managerUserId: string;
    surveyorUserId: string;
    officeId: string;
    kind: ContractDocumentPackageKind;
    numberLetterOverride?: string;
    currentNumber: string;
  }): Promise<string | null> {
    const preview = await this.preview({
      managerUserId: input.managerUserId,
      surveyorUserId: input.surveyorUserId,
      officeId: input.officeId,
      kind: input.kind,
      numberLetterOverride: input.numberLetterOverride,
    });
    if (!preview.ok || !preview.recommendedNumber) return null;

    const current = input.currentNumber.trim();
    const isEmpty = !current;
    const looksLikeSequence = isSystemContractNumberFormat(current, {
      officePrefix: preview.officePrefix ?? '',
      managerCode: preview.managerCode ?? '',
      surveyorCode: preview.surveyorCode ?? '',
      directionLetter: preview.directionLetter ?? '',
    });

    if (!isEmpty && !looksLikeSequence) return null;

    const allocated = await this.allocate({
      managerUserId: input.managerUserId,
      surveyorUserId: input.surveyorUserId,
      officeId: input.officeId,
      kind: input.kind,
      numberLetterOverride: input.numberLetterOverride,
    });
    return allocated.recommendedNumber;
  }

  private async allocateSequence(managerUserId: string, directionId: string): Promise<number> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.holds.expireStaleHoldsTx(tx, managerUserId, directionId);
      // Постоянный allocate занимает следующий свободный (с учётом soft-hold), затем поднимает счётчик.
      const sequence = await this.holds.peekNextAvailableSequenceTx(tx, managerUserId, directionId);
      const existing = await tx.contractDocumentNumberCounter.findUnique({
        where: {
          managerUserId_directionId: { managerUserId, directionId },
        },
      });
      if (existing) {
        const nextValue = Math.max(existing.value, sequence);
        const updated = await tx.contractDocumentNumberCounter.update({
          where: { id: existing.id },
          data: { value: nextValue },
        });
        return updated.value;
      }
      const created = await tx.contractDocumentNumberCounter.create({
        data: { managerUserId, directionId, value: sequence },
      });
      return created.value;
    });
  }
}
