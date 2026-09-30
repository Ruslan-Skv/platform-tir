import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';
import type { PackageCustomerShareContext } from './packageCustomerDocumentShare';

/**
 * Этап дистанционного подписания (ПЭП): договор / акт начала работ / акт сдачи-приёмки /
 * одно доп. соглашение. Зеркало backend-логики `signing-stage.ts` — сервер остаётся
 * источником истины.
 */
export type RemoteSigningStage = 'CONTRACT' | 'ACT_START' | 'ACT_ACCEPTANCE' | 'ADDENDUM' | null;

const STAGE_BY_TAB: Partial<Record<PackageDocumentTabId, Exclude<RemoteSigningStage, null>>> = {
  contract: 'CONTRACT',
  actStart: 'ACT_START',
  actAcceptance: 'ACT_ACCEPTANCE',
  addendum1: 'ADDENDUM',
  addendum2: 'ADDENDUM',
  addendum3: 'ADDENDUM',
  addendum4: 'ADDENDUM',
  addendum5: 'ADDENDUM',
};

export function remoteSigningStageOf(tabIds: string[]): {
  stage: RemoteSigningStage;
  stageTabs: string[];
  stageTab: string | null;
} {
  const stageTabs = [...new Set(tabIds.filter((t) => t in STAGE_BY_TAB))];
  if (stageTabs.length === 1) {
    return {
      stage: STAGE_BY_TAB[stageTabs[0] as PackageDocumentTabId]!,
      stageTabs,
      stageTab: stageTabs[0]!,
    };
  }
  return { stage: null, stageTabs, stageTab: null };
}

/** «addendum3» → 3; не Д/с-таб → null. */
function addendumOrdinalFromTab(tab: string | null): number | null {
  const match = /^addendum([1-5])$/.exec(tab ?? '');
  return match ? Number(match[1]) : null;
}

export function remoteSigningStageLabel(
  stage: RemoteSigningStage,
  stageTab?: string | null
): string {
  switch (stage) {
    case 'CONTRACT':
      return 'Договор';
    case 'ACT_START':
      return 'Акт начала работ';
    case 'ACT_ACCEPTANCE':
      return 'Акт сдачи-приёмки';
    case 'ADDENDUM': {
      const ordinal = addendumOrdinalFromTab(stageTab ?? '');
      return ordinal ? `Д/с №${ordinal}` : 'Д/с';
    }
    default:
      return 'Документы';
  }
}

/** Локальный аналог addendumSlotHasData: в Д/с есть расчёт/спецификация/комментарий. */
function addendumSlotHasClientData(slot: unknown): boolean {
  if (!slot || typeof slot !== 'object') return false;
  const s = slot as Record<string, unknown>;
  const snapTotal = (s.snapshot as Record<string, unknown> | undefined)?.total;
  const excludedTotal = (s.excludedSnapshot as Record<string, unknown> | undefined)?.total;
  return (
    (typeof snapTotal === 'number' && Number.isFinite(snapTotal)) ||
    (typeof excludedTotal === 'number' && Number.isFinite(excludedTotal)) ||
    (Array.isArray(s.selectedPresetIds) && s.selectedPresetIds.length > 0) ||
    (Array.isArray(s.excludedSelectedPresetIds) && s.excludedSelectedPresetIds.length > 0) ||
    (Array.isArray(s.specificationAddedLines) && s.specificationAddedLines.length > 0) ||
    (Array.isArray(s.specificationExcludedLines) && s.specificationExcludedLines.length > 0) ||
    String(s.notes ?? '').trim() !== '' ||
    String(s.excludedNotes ?? '').trim() !== ''
  );
}

/**
 * Превалидация состава документов для сессии ЭП (правила этапов).
 * Возвращает текст проблемы или null, если состав допустим.
 */
export function remoteSigningStageProblem(input: {
  selectedTabs: PackageDocumentTabId[];
  ctx: Pick<PackageCustomerShareContext, 'packageKind' | 'form'>;
}): string | null {
  const { stage, stageTabs, stageTab } = remoteSigningStageOf(input.selectedTabs);
  const form = input.ctx.form;
  const concluded = Boolean(form.contractConcludedAt?.trim());

  if (stageTabs.length > 1) {
    return 'Нельзя объединять в одной ссылке договор, акты и доп. соглашения — отправьте их отдельными сессиями: сначала договор, затем акты и Д/с.';
  }
  if (stage === 'CONTRACT') {
    if (concluded) {
      return 'Договор уже подписан. Для изменений используйте доп. соглашения (Д/с) или снимите вкладку «Договор».';
    }
    return null;
  }
  if (stage === 'ACT_START' || stage === 'ACT_ACCEPTANCE' || stage === 'ADDENDUM') {
    if (!concluded) {
      return `Сначала подпишите договор: «${remoteSigningStageLabel(stage, stageTab)}» направляется заказчику после подписания договора.`;
    }
  }
  if (stage === 'ACT_START') {
    if (input.ctx.packageKind !== 'REPAIR') {
      return '«Акт начала работ» можно отправить на подписание только для направления «Ремонт».';
    }
    if (form.repairWorkStartActSignedAt?.trim()) {
      return 'Акт начала работ уже отмечен подписанным — повторная отправка на ЭП не требуется.';
    }
  }
  if (stage === 'ACT_ACCEPTANCE' && form.repairContractCloseActSignedAt?.trim()) {
    return 'Акт сдачи-приёмки уже отмечен подписанным — повторная отправка на ЭП не требуется.';
  }
  if (stage === 'ADDENDUM') {
    const ordinal = addendumOrdinalFromTab(stageTab ?? '');
    const slot = form.addendumSlots[(ordinal ?? 0) - 1];
    if (!addendumSlotHasClientData(slot)) {
      return `Д/с №${ordinal} пустое — прикрепите к нему расчёт (или заполните спецификацию) перед отправкой на подписание.`;
    }
    if (slot && slot.status !== 'OPEN') {
      return `Д/с №${ordinal} уже отмечено подписанным — повторная отправка на ЭП не требуется.`;
    }
  }
  return null;
}
