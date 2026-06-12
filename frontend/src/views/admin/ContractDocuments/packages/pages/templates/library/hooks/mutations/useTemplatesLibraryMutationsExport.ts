import { useCallback } from 'react';

import { getContractDocumentTemplatePresets } from '@/shared/api/admin-contract-document-packages';
import { isPackageLibraryTemplatePreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageTemplatePresetTab';

import {
  filterTemplatesByActiveKind,
  normalizeContractTemplatePreset,
} from '../../templatesLibraryPresetUtils';
import type { UseTemplatesLibraryMutationsParams } from './templatesLibraryMutationsTypes';

export function useTemplatesLibraryMutationsExport(params: UseTemplatesLibraryMutationsParams) {
  const { isSuperAdmin, activeLibraryKind, items, setItems, setOk, refreshTrashCount } = params;

  const handleExportSeedJson = useCallback(() => {
    if (!isSuperAdmin) return;
    const libraryItems = items
      .filter((it) => isPackageLibraryTemplatePreset(it) && !it.archived)
      .map((it) => normalizeContractTemplatePreset(it));
    const blob = new Blob([JSON.stringify({ version: 1, items: libraryItems }, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const kindSlug = activeLibraryKind.toLowerCase();
    a.download = `${kindSlug}-library-templates.seed.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOk(
      `Скачан ${kindSlug}-library-templates.seed.json — положите в backend/prisma/seed-data/ в репозиторий и выполните сидирование соответствующего направления.`
    );
  }, [isSuperAdmin, items, activeLibraryKind, setOk]);

  const handleTrashRestored = useCallback(() => {
    void refreshTrashCount();
    void (async () => {
      try {
        const templatesRes = await getContractDocumentTemplatePresets(activeLibraryKind);
        const nextRaw = (templatesRes.items ?? []).map((it) => normalizeContractTemplatePreset(it));
        const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
        setItems(next);
      } catch {
        /* ignore */
      }
    })();
  }, [activeLibraryKind, refreshTrashCount, setItems]);

  return {
    handleExportSeedJson,
    handleTrashRestored,
  };
}
