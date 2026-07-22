import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractSignatoryProfile,
  type ContractTemplatePreset,
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  getContractDocumentSignatoryProfiles,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { getContractDocumentTemplatePresetsTrash } from '@/shared/api/admin-contract-document-template-presets-trash';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';
import { ensureCeilingsContractTemplatePresets } from '@/views/admin/ContractDocuments/packages/families/product-like/ceilings/ensureCeilingsContractTemplatePresets';
import { fixMisassignedProductLibraryPresets } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateSelection';
import type { PackageLibraryTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import {
  filterTemplatesByActiveKind,
  normalizeContractTemplatePreset,
} from '../templatesLibraryPresetUtils';

type UseTemplatesLibraryLoadArgs = {
  activeLibraryKind: ContractDocumentPackageKind;
  templatesScopeKey: (
    kind: ContractDocumentPackageKind,
    tab: PackageLibraryTemplateTabId,
    archived: boolean
  ) => string;
  setError: (message: string | null) => void;
  lastSavedSnapshotRef: RefObject<string>;
  isInitialHydrationRef: RefObject<boolean>;
};

export function useTemplatesLibraryLoad({
  activeLibraryKind,
  templatesScopeKey,
  setError,
  lastSavedSnapshotRef,
  isInitialHydrationRef,
}: UseTemplatesLibraryLoadArgs) {
  const [items, setItems] = useState<ContractTemplatePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [firstExecutorProfile, setFirstExecutorProfile] = useState<ExecutorRequisiteProfile | null>(
    null
  );
  const [firstSignatoryProfile, setFirstSignatoryProfile] =
    useState<ContractSignatoryProfile | null>(null);

  const templatesLoadRequestIdRef = useRef(0);
  const itemsRef = useRef<ContractTemplatePreset[]>([]);
  itemsRef.current = items;

  const fetchTemplateTrashTotal = useCallback(
    () => getContractDocumentTemplatePresetsTrash({ page: 1, limit: 1 }),
    []
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(fetchTemplateTrashTotal);

  useEffect(() => {
    const requestId = ++templatesLoadRequestIdRef.current;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [templatesRes, executorRes, signatoryRes] = await Promise.allSettled([
          getContractDocumentTemplatePresets(activeLibraryKind),
          getContractDocumentExecutorProfiles(activeLibraryKind),
          getContractDocumentSignatoryProfiles(activeLibraryKind),
        ]);
        if (templatesLoadRequestIdRef.current !== requestId) return;
        if (executorRes.status === 'fulfilled') {
          setFirstExecutorProfile(executorRes.value.items?.[0] ?? null);
        }
        if (signatoryRes.status === 'fulfilled') {
          setFirstSignatoryProfile(signatoryRes.value.items?.[0] ?? null);
        }
        if (templatesRes.status !== 'fulfilled') {
          throw new Error('Не удалось загрузить библиотеку шаблонов');
        }
        const nextRaw = (templatesRes.value.items ?? []).map((it) =>
          normalizeContractTemplatePreset(it)
        );
        const next = fixMisassignedProductLibraryPresets(
          filterTemplatesByActiveKind(nextRaw, activeLibraryKind),
          activeLibraryKind
        );
        const ensured =
          activeLibraryKind === 'CEILINGS'
            ? await ensureCeilingsContractTemplatePresets(next)
            : { items: next, changed: false };
        if (templatesLoadRequestIdRef.current !== requestId) return;
        setItems(ensured.items);
        lastSavedSnapshotRef.current = JSON.stringify(
          ensured.items.map((it) => normalizeContractTemplatePreset(it))
        );
        isInitialHydrationRef.current = true;
        void refreshTrashCount();
      } catch (e) {
        if (templatesLoadRequestIdRef.current !== requestId) return;
        setError(e instanceof Error ? e.message : 'Не удалось загрузить библиотеку шаблонов');
      } finally {
        if (templatesLoadRequestIdRef.current !== requestId) return;
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLibraryKind, templatesScopeKey]);

  return {
    items,
    setItems,
    loading,
    firstExecutorProfile,
    firstSignatoryProfile,
    trashCount,
    refreshTrashCount,
    templatesLoadRequestIdRef,
    itemsRef,
  };
}
