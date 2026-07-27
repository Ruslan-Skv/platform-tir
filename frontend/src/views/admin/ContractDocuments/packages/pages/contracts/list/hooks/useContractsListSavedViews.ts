import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ContractsListFiltersPersisted } from '../contractsListFilters';
import {
  type ContractsListSavedView,
  addContractsListSavedView,
  contractsListSavedViewMatchesFilters,
  loadContractsListSavedViews,
  persistContractsListSavedViews,
  removeContractsListSavedView,
  renameContractsListSavedView,
} from '../contractsListSavedViews';
import {
  CONTRACTS_LIST_QUEUE_PRESETS,
  resolveContractsListQueuePreset,
} from '../contractsListScope';

export type UseContractsListSavedViewsParams = {
  currentFilters: ContractsListFiltersPersisted;
  onApplyFilters: (filters: ContractsListFiltersPersisted) => void;
};

function buildSuggestedTitles(filters: ContractsListFiltersPersisted): string[] {
  const queuePreset = resolveContractsListQueuePreset(filters.statusFilters);
  const directionSuffix =
    filters.directionFilters.length > 0 ? ` (${filters.directionFilters.length} напр.)` : '';

  const scopeBase =
    filters.listScope === 'mine'
      ? 'Мои'
      : filters.listScope === 'my_directions'
        ? 'Мои направления'
        : 'Все';

  const queueLabel = queuePreset
    ? (CONTRACTS_LIST_QUEUE_PRESETS.find((preset) => preset.id === queuePreset)?.label ?? null)
    : null;

  const exactTitle =
    filters.listScope === 'mine' && queuePreset === 'in_project'
      ? 'Мои черновики'
      : filters.listScope === 'mine' && queuePreset === 'to_production'
        ? 'Мои на подпись'
        : filters.listScope === 'my_directions' && queuePreset === 'production'
          ? 'Мои направления / Производство'
          : queueLabel
            ? `${scopeBase} / ${queueLabel}`
            : `${scopeBase} договоры`;

  const suggestions = new Set<string>([
    `${exactTitle}${directionSuffix}`,
    scopeBase === 'Все' ? 'Общий список' : `${scopeBase} договоры${directionSuffix}`,
  ]);

  if (queueLabel && queuePreset !== 'all') {
    suggestions.add(`${queueLabel}${directionSuffix}`);
  }

  return [...suggestions].filter((title) => title.trim().length > 0).slice(0, 3);
}

export function useContractsListSavedViews({
  currentFilters,
  onApplyFilters,
}: UseContractsListSavedViewsParams) {
  const [views, setViews] = useState<ContractsListSavedView[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    setViews(loadContractsListSavedViews());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistContractsListSavedViews(views);
  }, [views, hydrated]);

  const activeViewId = useMemo(() => {
    const match = views.find((v) => contractsListSavedViewMatchesFilters(v, currentFilters));
    return match?.id ?? null;
  }, [views, currentFilters]);

  const suggestedTitles = useMemo(() => buildSuggestedTitles(currentFilters), [currentFilters]);

  const applyView = useCallback(
    (id: string) => {
      const view = views.find((v) => v.id === id);
      if (!view) return;
      onApplyFilters(view.filters);
      setSaveOpen(false);
      setDraftTitle('');
    },
    [views, onApplyFilters]
  );

  const openSaveComposer = useCallback(() => {
    setSaveOpen(true);
    setDraftTitle((current) => current || suggestedTitles[0] || '');
  }, [suggestedTitles]);

  const saveCurrentView = useCallback(() => {
    const title = draftTitle.trim();
    if (!title) return;
    setViews((prev) => addContractsListSavedView(prev, title, currentFilters));
    setDraftTitle('');
    setSaveOpen(false);
  }, [draftTitle, currentFilters]);

  const deleteView = useCallback((id: string) => {
    setViews((prev) => removeContractsListSavedView(prev, id));
  }, []);

  const renameView = useCallback((id: string, title: string) => {
    setViews((prev) => renameContractsListSavedView(prev, id, title));
  }, []);

  return {
    views,
    activeViewId,
    draftTitle,
    setDraftTitle,
    saveOpen,
    setSaveOpen,
    suggestedTitles,
    applyView,
    openSaveComposer,
    saveCurrentView,
    deleteView,
    renameView,
  };
}
