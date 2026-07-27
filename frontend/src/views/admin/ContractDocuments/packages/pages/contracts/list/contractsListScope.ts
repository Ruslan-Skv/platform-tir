import type { ContractDocumentPackageStatus } from '@/shared/api/admin-contract-document-packages';

import type { ContractsListScope } from './contractsListFilters';

const MANAGER_LIKE_ROLES = new Set(['MANAGER', 'TECHNOLOGIST', 'TRAINEE', 'CONTENT_MANAGER']);

const PRODUCTION_QUEUE_ROLES = new Set([
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
]);

export const CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS = [
  { value: 'IN_PROJECT', label: 'В проекте' },
  { value: 'SIGNED', label: 'Подписан' },
  { value: 'WORK_IN_PROGRESS', label: 'В работе' },
  { value: 'CLOSED', label: 'Закрыт' },
  { value: 'REFUSED', label: 'Отказ' },
] as const;

/** Быстрые рабочие очереди (этап конвейера). */
export type ContractsListQueuePreset =
  | 'all'
  | 'in_project'
  | 'to_production'
  | 'in_work'
  | 'production'
  | 'closed'
  | 'refused';

export const CONTRACTS_LIST_QUEUE_PRESETS: Array<{
  id: ContractsListQueuePreset;
  label: string;
  statusFilters: string[];
  hint?: string;
}> = [
  { id: 'all', label: 'Все этапы', statusFilters: [] },
  {
    id: 'in_project',
    label: 'В проекте',
    statusFilters: ['IN_PROJECT'],
    hint: 'Черновики и оформление у менеджеров',
  },
  {
    id: 'to_production',
    label: 'В производство',
    statusFilters: ['SIGNED'],
    hint: 'Подписан, ещё не в работах',
  },
  {
    id: 'in_work',
    label: 'В работе',
    statusFilters: ['WORK_IN_PROGRESS'],
    hint: 'Производство / монтаж',
  },
  {
    id: 'production',
    label: 'Производство',
    statusFilters: ['SIGNED', 'WORK_IN_PROGRESS'],
    hint: 'Подписан + в работе (очередь ведущих)',
  },
  {
    id: 'closed',
    label: 'Закрытые',
    statusFilters: ['CLOSED'],
  },
  {
    id: 'refused',
    label: 'Отказ',
    statusFilters: ['REFUSED'],
  },
];

export type ContractsListRoleDefaults = {
  listScope: ContractsListScope;
  statusFilters: string[];
  queuePreset: ContractsListQueuePreset;
};

/** Дефолты очереди при первом заходе (пока scopeTouched=false). */
export function getContractsListRoleDefaults(
  role: string | null | undefined
): ContractsListRoleDefaults {
  if (!role) {
    return { listScope: 'all', statusFilters: [], queuePreset: 'all' };
  }
  if (MANAGER_LIKE_ROLES.has(role)) {
    return { listScope: 'mine', statusFilters: [], queuePreset: 'all' };
  }
  if (PRODUCTION_QUEUE_ROLES.has(role)) {
    return {
      listScope: 'my_directions',
      statusFilters: ['SIGNED', 'WORK_IN_PROGRESS'],
      queuePreset: 'production',
    };
  }
  return { listScope: 'all', statusFilters: [], queuePreset: 'all' };
}

export function toggleContractsListChipValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function resolveContractsListQueuePreset(
  statusFilters: string[]
): ContractsListQueuePreset | null {
  const sorted = [...statusFilters].sort().join(',');
  for (const preset of CONTRACTS_LIST_QUEUE_PRESETS) {
    if ([...preset.statusFilters].sort().join(',') === sorted) {
      return preset.id;
    }
  }
  return null;
}

/**
 * Грубый DB-статус пакета для серверного предфильтра по пайплайн-статусам.
 * Пайплайн SIGNED/WORK/CLOSED живёт в CONTRACT_CONCLUDED.
 */
export function mapPipelineStatusesToPackageDbStatuses(
  statusFilters: string[]
): ContractDocumentPackageStatus[] | undefined {
  if (statusFilters.length === 0) return undefined;
  const out = new Set<ContractDocumentPackageStatus>();
  for (const s of statusFilters) {
    if (s === 'REFUSED') out.add('REFUSED');
    else if (s === 'IN_PROJECT') out.add('IN_PROGRESS');
    else if (s === 'SIGNED' || s === 'WORK_IN_PROGRESS' || s === 'CLOSED') {
      out.add('CONTRACT_CONCLUDED');
    }
  }
  return out.size > 0 ? [...out] : undefined;
}
