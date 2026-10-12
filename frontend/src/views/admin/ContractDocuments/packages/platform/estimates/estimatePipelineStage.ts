import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

export type EstimatePipelineTab = 'active' | 'attached' | 'signed' | 'deferred';

/** Вкладки, доступные для ручного перевода расчёта. */
export type EstimatePipelineManualTab = 'active' | 'deferred';

export const ESTIMATE_PIPELINE_TAB_LABELS: Record<EstimatePipelineTab, string> = {
  active: 'В работе',
  attached: 'Прикреплены',
  signed: 'Подписаны',
  deferred: 'Отложены',
};

/** Подсказки на ярлыках вкладок: что лежит на вкладке и как расчёты туда попадают. */
export const ESTIMATE_PIPELINE_TAB_TOOLTIPS: Record<EstimatePipelineTab, string> = {
  active:
    'Новые и текущие расчёты. Вновь созданные расчёты попадают сюда автоматически. Ручной перевод на другие вкладки, кроме «Отложены», не предусмотрен.',
  attached:
    'Расчёты, прикреплённые к пакету документов (договору) или Д/с, которые ещё не подписаны. Перемещаются сюда автоматически при прикреплении; связка — целиком, когда прикреплён её последний расчёт.',
  signed:
    'Расчёты, прикреплённые к подписанным договорам или Д/с. Перемещаются сюда автоматически после подписания; связка — целиком, когда подписан её последний расчёт.',
  deferred:
    'Расчёты, по которым заказчик взял паузу (подумать, сделать позже). Переносятся вручную кнопкой «Отложить» (кроме подписанных), обратно — кнопкой «В работу». Прикрепление к договору возвращает расчёт в работу автоматически.',
};

export function parseEstimatePipelineTab(raw: string | null): EstimatePipelineTab {
  if (raw === 'attached') return 'attached';
  if (raw === 'signed') return 'signed';
  if (raw === 'deferred') return 'deferred';
  return 'active';
}

/**
 * Ручная стадия расчёта. Из хранимых значений ручной остаётся только «Отложены»:
 * `deferred` — новое значение, `prospect` и `archived` — прежние («В перспективе», архив),
 * которые после отказа от этих вкладок трактуются как «Отложены». Значение `contract`
 * (бывшая ручная вкладка «В договорах») игнорируется: прикрепление и подписание
 * определяются автоматически по привязкам к договорам.
 */
export function getEstimateManualPipelineTab(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): 'active' | 'deferred' {
  if (preset.pipelineStage === 'deferred' || preset.pipelineStage === 'prospect') {
    return 'deferred';
  }
  if (preset.archived) return 'deferred';
  if (preset.groupId) {
    const g = groups.find((x) => x.id === preset.groupId);
    if (g?.archived || g?.pipelineStage === 'prospect') return 'deferred';
  }
  return 'active';
}

/** Ручной перенос («Отложены» ↔ «В работе») снимает прежний архивный флаг. */
export function applyPresetPipelineTab(
  preset: ContractEstimatePreset,
  tab: EstimatePipelineManualTab,
  ts: string
): ContractEstimatePreset {
  if (tab === 'active') {
    const { pipelineStage: _drop, archived: _dropArchived, ...rest } = preset;
    return { ...rest, updatedAt: ts };
  }
  const { archived: _dropArchived, ...rest } = preset;
  return { ...rest, pipelineStage: 'deferred', updatedAt: ts };
}
