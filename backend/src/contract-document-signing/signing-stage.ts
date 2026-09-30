import { BadRequestException } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';

/**
 * Этап дистанционного подписания (ПЭП). Сессия подписывает ровно один «этапный»
 * документ: договор, акт начала работ, акт сдачи-приёмки или одно доп. соглашение.
 * Прочие документы (спецификация, счёт-заказ, смета…) этапа не образуют
 * и статус пакета не меняют.
 */
export type SigningStage = 'CONTRACT' | 'ACT_START' | 'ACT_ACCEPTANCE' | 'ADDENDUM' | null;

const STAGE_BY_TAB: Record<string, Exclude<SigningStage, null>> = {
  contract: 'CONTRACT',
  actStart: 'ACT_START',
  actAcceptance: 'ACT_ACCEPTANCE',
  addendum1: 'ADDENDUM',
  addendum2: 'ADDENDUM',
  addendum3: 'ADDENDUM',
  addendum4: 'ADDENDUM',
  addendum5: 'ADDENDUM',
};

export function detectSigningStage(documents: Array<{ tabId: string }>): {
  stage: SigningStage;
  stageTabs: string[];
  /** Единственный этапный документ сессии (при stage !== null). */
  stageTab: string | null;
} {
  const stageTabs = [...new Set(documents.map((d) => d.tabId).filter((t) => t in STAGE_BY_TAB))];
  if (stageTabs.length === 0) return { stage: null, stageTabs, stageTab: null };
  if (stageTabs.length > 1) return { stage: null, stageTabs, stageTab: null };
  return { stage: STAGE_BY_TAB[stageTabs[0]!]!, stageTabs, stageTab: stageTabs[0]! };
}

/** «addendum3» → 3; не Д/с-таб → null. */
export function addendumOrdinalFromTab(tab: string | null | undefined): number | null {
  const match = /^addendum([1-5])$/.exec(tab ?? '');
  return match ? Number(match[1]) : null;
}

export function signingStageLabel(stage: SigningStage, stageTab?: string | null): string {
  switch (stage) {
    case 'CONTRACT':
      return 'Договор';
    case 'ACT_START':
      return 'Акт начала работ';
    case 'ACT_ACCEPTANCE':
      return 'Акт сдачи-приёмки';
    case 'ADDENDUM': {
      const ordinal = addendumOrdinalFromTab(stageTab);
      return ordinal ? `Доп. соглашение №${ordinal}` : 'Доп. соглашение';
    }
    default:
      return 'Документы';
  }
}

function formObject(formData: unknown): Record<string, unknown> {
  return formData && typeof formData === 'object' && !Array.isArray(formData)
    ? (formData as Record<string, unknown>)
    : {};
}

function formField(formData: unknown, key: string): string {
  return String(formObject(formData)[key] ?? '').trim();
}

function addendumSlotFromForm(formData: unknown, ordinal: number): Record<string, unknown> | null {
  const slots = formObject(formData).addendumSlots;
  if (!Array.isArray(slots)) return null;
  const slot = slots[ordinal - 1];
  return slot && typeof slot === 'object' && !Array.isArray(slot)
    ? (slot as Record<string, unknown>)
    : null;
}

/** Серверный аналог addendumSlotHasData (frontend): в Д/с есть расчёт/спецификация/комментарий. */
function addendumSlotHasData(slot: Record<string, unknown> | null): boolean {
  if (!slot) return false;
  const snapshotTotal = (slot.snapshot as Record<string, unknown> | undefined)?.total;
  const excludedTotal = (slot.excludedSnapshot as Record<string, unknown> | undefined)?.total;
  return (
    (typeof snapshotTotal === 'number' && Number.isFinite(snapshotTotal)) ||
    (typeof excludedTotal === 'number' && Number.isFinite(excludedTotal)) ||
    (Array.isArray(slot.selectedPresetIds) && slot.selectedPresetIds.length > 0) ||
    (Array.isArray(slot.excludedSelectedPresetIds) && slot.excludedSelectedPresetIds.length > 0) ||
    (Array.isArray(slot.specificationAddedLines) && slot.specificationAddedLines.length > 0) ||
    (Array.isArray(slot.specificationExcludedLines) &&
      slot.specificationExcludedLines.length > 0) ||
    String(slot.notes ?? '').trim() !== '' ||
    String(slot.excludedNotes ?? '').trim() !== ''
  );
}

/**
 * Правила формирования сессии ЭП по составу документов:
 * - не более одного этапного документа в сессии (договор, акты и Д/с — отдельными ссылками);
 * - хронология: акты и Д/с направляются только после подписания договора;
 * - повторное подписание уже подписанного документа запрещено;
 * - «Акт начала работ» — только для направления «Ремонт»;
 * - Д/с подписывается только с прикреплённым расчётом (спецификацией).
 */
export function validateSigningStageCreation(input: {
  stage: SigningStage;
  stageTabs: string[];
  kind: ContractDocumentPackageKind;
  status: ContractDocumentPackageStatus;
  formData: unknown;
}): void {
  if (input.stageTabs.length > 1) {
    throw new BadRequestException(
      'Нельзя объединять в одной ссылке договор, акты и доп. соглашения — отправьте их отдельными сессиями: сначала договор, затем акты и Д/с.',
    );
  }
  if (input.stage === 'CONTRACT') {
    if (input.status === ContractDocumentPackageStatus.CONTRACT_CONCLUDED) {
      throw new BadRequestException(
        'Договор уже подписан. Для изменений используйте доп. соглашения (Д/с) или направьте документы без вкладки «Договор».',
      );
    }
    if (input.status === ContractDocumentPackageStatus.REFUSED) {
      throw new BadRequestException('Договор в статусе отказа — отправка на ЭП недоступна.');
    }
    return;
  }
  if (
    input.stage === 'ACT_START' ||
    input.stage === 'ACT_ACCEPTANCE' ||
    input.stage === 'ADDENDUM'
  ) {
    if (input.status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED) {
      throw new BadRequestException(
        `Сначала подпишите договор: «${signingStageLabel(input.stage, input.stageTabs[0])}» направляется заказчику после подписания договора.`,
      );
    }
  }
  if (input.stage === 'ACT_START') {
    if (input.kind !== ContractDocumentPackageKind.REPAIR) {
      throw new BadRequestException(
        '«Акт начала работ» можно отправить на подписание только для направления «Ремонт».',
      );
    }
    if (formField(input.formData, 'repairWorkStartActSignedAt')) {
      throw new BadRequestException(
        'Акт начала работ уже отмечен подписанным — повторная отправка на ЭП не требуется.',
      );
    }
  }
  if (input.stage === 'ACT_ACCEPTANCE') {
    if (formField(input.formData, 'repairContractCloseActSignedAt')) {
      throw new BadRequestException(
        'Акт сдачи-приёмки уже отмечен подписанным — повторная отправка на ЭП не требуется.',
      );
    }
  }
  if (input.stage === 'ADDENDUM') {
    const ordinal = addendumOrdinalFromTab(input.stageTabs[0]);
    const slot = ordinal ? addendumSlotFromForm(input.formData, ordinal) : null;
    if (!addendumSlotHasData(slot)) {
      throw new BadRequestException(
        `Доп. соглашение №${ordinal} пустое — прикрепите к нему расчёт (или заполните спецификацию) перед отправкой на подписание.`,
      );
    }
    if (slot && slot.status !== 'OPEN') {
      throw new BadRequestException(
        `Доп. соглашение №${ordinal} уже отмечено подписанным — повторная отправка на ЭП не требуется.`,
      );
    }
  }
}

/** Хронология на момент подписания (статус мог измениться после создания ссылки). */
export function assertSigningChronologyAtSign(
  stage: SigningStage,
  status: ContractDocumentPackageStatus,
): void {
  if (stage !== 'ACT_START' && stage !== 'ACT_ACCEPTANCE' && stage !== 'ADDENDUM') {
    return;
  }
  if (status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED) {
    throw new BadRequestException(
      `Подписание «${signingStageLabel(stage)}» недоступно: договор ещё не подписан. Запросите у менеджера новую ссылку после подписания договора.`,
    );
  }
}
