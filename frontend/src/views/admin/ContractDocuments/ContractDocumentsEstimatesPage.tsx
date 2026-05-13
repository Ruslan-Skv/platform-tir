'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ContractDocumentPackageStatus,
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { getMeasurements } from '@/shared/api/admin-crm';

import styles from './ContractDocuments.module.css';
import { getDisplayContractDate, getDisplayContractNumber } from './repair/packageContractDisplay';
import { clampEstimateAdditionalMarkupPercent } from './repair/repairApplyEstimatePresetIds';
import { persistRepairPackageAfterRemovingEstimatePreset } from './repair/repairDetachEstimatePresetFromPackages';

type EstimatePackageUsage =
  | {
      packageId: string;
      packageTitle: string;
      kind: 'contract';
      packageStatus: ContractDocumentPackageStatus;
      contractNumber: string;
      contractDate: string;
    }
  | {
      packageId: string;
      packageTitle: string;
      kind: 'addendum';
      addendumOrdinal: number;
      addendumStatus: 'OPEN' | 'SIGNED';
      /** Дата из шапки Д/с (как в пакете документов), часто дд.мм.гггг */
      addendumDate: string;
      contractNumber: string;
      contractDate: string;
    };

function isUsageLocked(u: EstimatePackageUsage): boolean {
  if (u.kind === 'contract') {
    return u.packageStatus === 'CONTRACT_CONCLUDED';
  }
  return u.addendumStatus === 'SIGNED';
}

function formatEstimatePackageUsageLabel(u: EstimatePackageUsage): string {
  if (u.kind === 'contract') {
    return `Договор № ${u.contractNumber} от ${u.contractDate}`;
  }
  const d = u.addendumDate.trim();
  const datePart = d ? `${d} г.` : '—';
  return `Д/с №${u.addendumOrdinal} от ${datePart} к договору № ${u.contractNumber} от ${u.contractDate}`;
}

function sortEstimateGroupsByTitle(gs: ContractEstimateGroup[]) {
  return [...gs].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
}

function parseOptionalPercentInput(raw: string): number | undefined {
  const t = raw.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Убирает ссылку на несуществующую группу (после удаления объекта и т.п.). */
function stripOrphanGroupIds(
  rows: ContractEstimatePreset[],
  groupList: ContractEstimateGroup[]
): ContractEstimatePreset[] {
  const ids = new Set(groupList.map((g) => g.id));
  return rows.map((it) => {
    if (it.groupId && ids.has(it.groupId)) return it;
    const { groupId: _removed, ...rest } = it;
    return rest as ContractEstimatePreset;
  });
}

/** Иконки фильтра по привязке расчёта к договору (отдельная визуальная группа). */
function EstimatesAttachmentFilterControl({
  value,
  onChange,
  disabled,
}: {
  value: 'all' | 'bound' | 'unbound';
  onChange: (next: 'all' | 'bound' | 'unbound') => void;
  disabled?: boolean;
}) {
  const btn = (mode: 'all' | 'bound' | 'unbound', label: string, children: ReactNode) => (
    <button
      type="button"
      className={`${styles.estimatesAttachmentFilterBtn} ${value === mode ? styles.estimatesAttachmentFilterBtnActive : ''}`}
      disabled={disabled}
      aria-pressed={value === mode}
      aria-label={label}
      title={label}
      onClick={() => onChange(mode)}
    >
      {children}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="Фильтр по привязке к договору"
      className={styles.estimatesAttachmentFilterGroup}
    >
      {btn(
        'all',
        'Все расчёты',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      )}
      {btn(
        'bound',
        'Только привязанные к договору',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
      {btn(
        'unbound',
        'Только не привязанные к договору',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          <line x1="4" y1="4" x2="20" y2="20" />
        </svg>
      )}
    </div>
  );
}

export function ContractDocumentsEstimatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [groups, setGroups] = useState<ContractEstimateGroup[]>([]);
  const [repairPackages, setRepairPackages] = useState<
    Array<{
      id: string;
      title: string | null;
      status: ContractDocumentPackageStatus;
      formData: Record<string, unknown>;
      crmContract?: { contractNumber: string; contractDate: string } | null;
    }>
  >([]);
  const [attachmentFilter, setAttachmentFilter] = useState<'all' | 'bound' | 'unbound'>('all');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set());
  const [detachEditModal, setDetachEditModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [detachDeleteModal, setDetachDeleteModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerateFromMeasurementOpen, setIsGenerateFromMeasurementOpen] = useState(false);
  const [completedMeasurements, setCompletedMeasurements] = useState<
    Array<{
      id: string;
      customerName: string;
      customerAddress: string | null;
      receptionDate: string;
    }>
  >([]);
  const [completedMeasurementsBusy, setCompletedMeasurementsBusy] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState('');
  const [archiveView, setArchiveView] = useState(false);

  const openGenerateFromMeasurementModal = useCallback(async () => {
    setIsGenerateFromMeasurementOpen(true);
    setCompletedMeasurementsBusy(true);
    setSelectedMeasurementId('');
    try {
      const res = await getMeasurements({ status: 'COMPLETED', page: 1, limit: 200 });
      const rows = (res.data ?? [])
        .filter((m) => (m.comments ?? '').includes('[REPAIR_MEASUREMENT_DATA_V1]'))
        .map((m) => ({
          id: m.id,
          customerName: m.customerName || 'Без имени',
          customerAddress: m.customerAddress ?? null,
          receptionDate: m.receptionDate,
        }));
      setCompletedMeasurements(rows);
      if (rows.length > 0) setSelectedMeasurementId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить выполненные замеры');
    } finally {
      setCompletedMeasurementsBusy(false);
    }
  }, []);

  const fetchEstimatesFromServer = useCallback(async () => {
    const [presetsRes, packagesRes] = await Promise.all([
      getContractDocumentEstimatePresets('REPAIR'),
      getContractDocumentPackages('REPAIR'),
    ]);
    const loadedGroups = presetsRes.groups ?? [];
    setGroups(loadedGroups);
    setItems(stripOrphanGroupIds(presetsRes.items ?? [], loadedGroups));
    setRepairPackages(
      (packagesRes ?? []).map((p) => ({
        id: p.id,
        title: p.title ?? null,
        status:
          p.status === 'CONTRACT_CONCLUDED'
            ? 'CONTRACT_CONCLUDED'
            : p.status === 'REFUSED'
              ? 'REFUSED'
              : 'IN_PROGRESS',
        formData: (p.formData ?? {}) as Record<string, unknown>,
        crmContract: p.crmContract
          ? {
              contractNumber: p.crmContract.contractNumber,
              contractDate: p.crmContract.contractDate,
            }
          : null,
      }))
    );
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchEstimatesFromServer();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchEstimatesFromServer]);

  const refreshEstimates = async () => {
    if (refreshing || saving) return;
    setRefreshing(true);
    setError(null);
    setOk(null);
    try {
      await fetchEstimatesFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
    } finally {
      setRefreshing(false);
    }
  };

  const persistEstimates = async (
    nextItems: ContractEstimatePreset[],
    nextGroups: ContractEstimateGroup[]
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const cleaned = stripOrphanGroupIds(nextItems, nextGroups);
      await putContractDocumentEstimatePresets({
        kind: 'REPAIR',
        items: cleaned,
        groups: nextGroups,
      });
      setItems(cleaned);
      setGroups(nextGroups);
      setOk('Сохранено.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createObjectGroup = () => {
    const nextGroup: ContractEstimateGroup = {
      id: `grp_${Date.now()}`,
      title: `Объект ${groups.length + 1}`,
      updatedAt: new Date().toISOString(),
    };
    void persistEstimates(items, [...groups, nextGroup]);
  };

  const renameObjectGroup = (groupId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextGroups = groups.map((g) =>
      g.id === groupId ? { ...g, title: trimmed, updatedAt: new Date().toISOString() } : g
    );
    void persistEstimates(items, nextGroups);
  };

  const removeObjectGroup = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
    const nextGroups = groups.filter((g) => g.id !== groupId);
    const nextItems = items.map((it) => {
      if (it.groupId !== groupId) return it;
      const { groupId: _g, ...rest } = it;
      return rest as ContractEstimatePreset;
    });
    void persistEstimates(nextItems, nextGroups);
  };

  const setGroupArchived = (groupId: string, archived: boolean) => {
    const nextGroups = groups.map((g) => {
      if (g.id !== groupId) return g;
      if (archived) {
        return { ...g, archived: true, updatedAt: new Date().toISOString() };
      }
      const { archived: _drop, ...rest } = g;
      return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimateGroup;
    });
    if (!archived) {
      const nextItems = items.map((it) => {
        if (it.groupId !== groupId || !it.archived) return it;
        const { archived: _d, ...rest } = it;
        return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimatePreset;
      });
      void persistEstimates(nextItems, nextGroups);
      return;
    }
    void persistEstimates(items, nextGroups);
  };

  const setPresetArchived = (estimateId: string, archived: boolean) => {
    const nextItems = items.map((it) => {
      if (it.id !== estimateId) return it;
      if (archived) {
        return { ...it, archived: true, updatedAt: new Date().toISOString() };
      }
      const { archived: _drop, ...rest } = it;
      return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimatePreset;
    });
    void persistEstimates(nextItems, groups);
  };

  const assignEstimateToGroup = (estimateId: string, groupId: string | null) => {
    const nextItems = items.map((it) => {
      if (it.id !== estimateId) return it;
      let next: ContractEstimatePreset;
      if (!groupId) {
        const { groupId: _g, ...rest } = it;
        next = rest as ContractEstimatePreset;
      } else {
        next = { ...it, groupId };
        if (next.archived) {
          const { archived: _a, ...r } = next;
          next = { ...r } as ContractEstimatePreset;
        }
      }
      return next;
    });
    void persistEstimates(nextItems, groups);
  };

  const handleConfirmDetachEdit = async () => {
    if (!detachEditModal) return;
    const { estimateId, usages } = detachEditModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setDetachEditModal(null);
      return;
    }
    setSaving(true);
    setError(null);
    let detachOk = false;
    try {
      for (const u of usages) {
        await persistRepairPackageAfterRemovingEstimatePreset(u.packageId, it.id, items, groups);
      }
      const packagesRes = await getContractDocumentPackages('REPAIR');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          status:
            p.status === 'CONTRACT_CONCLUDED'
              ? 'CONTRACT_CONCLUDED'
              : p.status === 'REFUSED'
                ? 'REFUSED'
                : 'IN_PROGRESS',
          formData: (p.formData ?? {}) as Record<string, unknown>,
          crmContract: p.crmContract
            ? {
                contractNumber: p.crmContract.contractNumber,
                contractDate: p.crmContract.contractDate,
              }
            : null,
        }))
      );
      detachOk = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отвязать расчёт от договоров');
    } finally {
      setSaving(false);
    }
    if (!detachOk) return;
    setDetachEditModal(null);
    router.push(
      `/admin/contract-documents/estimates/workspace?id=${encodeURIComponent(estimateId)}`
    );
  };

  const handleConfirmDetachDelete = async () => {
    if (!detachDeleteModal) return;
    const { estimateId, usages } = detachDeleteModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setDetachDeleteModal(null);
      return;
    }
    setSaving(true);
    setError(null);
    let detachOk = false;
    try {
      for (const u of usages) {
        await persistRepairPackageAfterRemovingEstimatePreset(u.packageId, it.id, items, groups);
      }
      const packagesRes = await getContractDocumentPackages('REPAIR');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          status:
            p.status === 'CONTRACT_CONCLUDED'
              ? 'CONTRACT_CONCLUDED'
              : p.status === 'REFUSED'
                ? 'REFUSED'
                : 'IN_PROGRESS',
          formData: (p.formData ?? {}) as Record<string, unknown>,
          crmContract: p.crmContract
            ? {
                contractNumber: p.crmContract.contractNumber,
                contractDate: p.crmContract.contractDate,
              }
            : null,
        }))
      );
      detachOk = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отвязать расчёт от договоров');
    } finally {
      setSaving(false);
    }
    if (!detachOk) return;
    setDetachDeleteModal(null);
    await removeEstimateById(estimateId);
  };

  const removeEstimateById = async (id: string) => {
    const next = items.filter((it) => it.id !== id);
    await persistEstimates(next, groups);
  };

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const itemsSorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTs = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const bTs = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return bTs - aTs;
      }),
    [items]
  );

  const usageByEstimateId = useMemo(() => {
    const map = new Map<string, EstimatePackageUsage[]>();
    const pushUsage = (presetId: string, usage: EstimatePackageUsage) => {
      map.set(presetId, [...(map.get(presetId) ?? []), usage]);
    };

    for (const pkg of repairPackages) {
      const baseMeta = {
        packageId: pkg.id,
        packageTitle: pkg.title?.trim() || `Пакет ${pkg.id.slice(0, 8)}`,
      };
      const contractNumber = getDisplayContractNumber(pkg);
      const contractDate = getDisplayContractDate(pkg);

      const estimateRaw = (pkg.formData?.estimate ?? null) as Record<string, unknown> | null;
      const contractIds: string[] = [];
      if (estimateRaw && typeof estimateRaw.selectedPresetId === 'string') {
        const legacy = estimateRaw.selectedPresetId.trim();
        if (legacy) contractIds.push(legacy);
      }
      if (estimateRaw && Array.isArray(estimateRaw.selectedPresetIds)) {
        for (const id of estimateRaw.selectedPresetIds) {
          if (typeof id === 'string' && id.trim()) contractIds.push(id.trim());
        }
      }
      const contractUnique = [...new Set(contractIds)];
      if (contractUnique.length > 0) {
        const contractRow: EstimatePackageUsage = {
          ...baseMeta,
          kind: 'contract',
          packageStatus: pkg.status,
          contractNumber,
          contractDate,
        };
        for (const presetId of contractUnique) {
          pushUsage(presetId, contractRow);
        }
      }

      const addendumDatesRaw = pkg.formData?.addendumDocumentDates;
      const addendumDates: [string, string, string, string, string] = ['', '', '', '', ''];
      if (Array.isArray(addendumDatesRaw)) {
        for (let i = 0; i < 5; i++) {
          const d = addendumDatesRaw[i];
          addendumDates[i] = typeof d === 'string' ? d.trim() : '';
        }
      }

      const addendumSlotsRaw = pkg.formData?.addendumSlots;
      if (Array.isArray(addendumSlotsRaw)) {
        addendumSlotsRaw.forEach((slot, slotIndex0) => {
          if (slotIndex0 > 4) return;
          if (!slot || typeof slot !== 'object') return;
          const s = slot as Record<string, unknown>;
          const slotIds: string[] = [];
          const collect = (value: unknown) => {
            if (!Array.isArray(value)) return;
            for (const id of value) {
              if (typeof id === 'string' && id.trim()) slotIds.push(id.trim());
            }
          };
          collect(s.selectedPresetIds);
          collect(s.excludedSelectedPresetIds);
          const uniqueSlotIds = [...new Set(slotIds)];
          if (uniqueSlotIds.length === 0) return;
          const addendumRow: EstimatePackageUsage = {
            ...baseMeta,
            kind: 'addendum',
            addendumOrdinal: slotIndex0 + 1,
            addendumStatus: s.status === 'SIGNED' ? 'SIGNED' : 'OPEN',
            addendumDate: addendumDates[slotIndex0] ?? '',
            contractNumber,
            contractDate,
          };
          for (const presetId of uniqueSlotIds) {
            pushUsage(presetId, addendumRow);
          }
        });
      }
    }
    return map;
  }, [repairPackages]);

  /** Объект: нельзя менять наценку на уровне группы, если хотя бы один расчёт группы в подписанном договоре / Д/с. */
  const groupIdsWithLockedEstimate = useMemo(() => {
    const ids = new Set<string>();
    for (const it of items) {
      if (!it.groupId) continue;
      const usages = usageByEstimateId.get(it.id) ?? [];
      if (usages.some((u) => isUsageLocked(u))) ids.add(it.groupId);
    }
    return ids;
  }, [items, usageByEstimateId]);

  const updateGroupAdditionalMarkupPercent = (groupId: string, raw: string) => {
    if (groupIdsWithLockedEstimate.has(groupId)) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const parsed = parseOptionalPercentInput(raw);
    const hadExplicit = typeof group.additionalMarkupPercent === 'number';

    if (parsed === undefined) {
      if (!hadExplicit) return;
      const { additionalMarkupPercent: _drop, ...rest } = group;
      const nextGroups = groups.map((g) =>
        g.id === groupId
          ? ({ ...rest, updatedAt: new Date().toISOString() } as ContractEstimateGroup)
          : g
      );
      void persistEstimates(items, nextGroups);
      return;
    }

    const nextGroups = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        updatedAt: new Date().toISOString(),
        additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsed),
      };
    });
    void persistEstimates(items, nextGroups);
  };

  const updatePresetAdditionalMarkupPercent = (estimateId: string, raw: string) => {
    const usages = usageByEstimateId.get(estimateId) ?? [];
    if (usages.some((u) => isUsageLocked(u))) return;
    const current = items.find((it) => it.id === estimateId);
    if (!current) return;
    const parsed = parseOptionalPercentInput(raw);
    const hadExplicit = typeof current.additionalMarkupPercent === 'number';

    if (parsed === undefined) {
      if (!hadExplicit) return;
      const { additionalMarkupPercent: _drop, ...rest } = current;
      const nextItems = items.map((it) =>
        it.id === estimateId ? (rest as ContractEstimatePreset) : it
      );
      void persistEstimates(nextItems, groups);
      return;
    }

    const nextItems = items.map((it) => {
      if (it.id !== estimateId) return it;
      return {
        ...it,
        additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsed),
      };
    });
    void persistEstimates(nextItems, groups);
  };

  const visibleItems = useMemo(() => {
    const base = itemsSorted.filter((it) => {
      const isBound = (usageByEstimateId.get(it.id)?.length ?? 0) > 0;
      if (attachmentFilter === 'bound') return isBound;
      if (attachmentFilter === 'unbound') return !isBound;
      return true;
    });
    return base.filter((it) => {
      const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
      const groupArchived = Boolean(g?.archived);
      const rowArchived = Boolean(it.archived);
      const inArchiveCombined = groupArchived || rowArchived;
      return archiveView ? inArchiveCombined : !inArchiveCombined;
    });
  }, [itemsSorted, attachmentFilter, usageByEstimateId, archiveView, groups]);

  const hasAnythingInArchive = useMemo(
    () =>
      items.some((it) => {
        const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
        return Boolean(it.archived) || Boolean(g?.archived);
      }),
    [items, groups]
  );

  const groupsSortedMain = useMemo(
    () => sortEstimateGroupsByTitle(groups.filter((g) => !g.archived)),
    [groups]
  );
  const groupsSortedArchived = useMemo(
    () => sortEstimateGroupsByTitle(groups.filter((g) => Boolean(g.archived))),
    [groups]
  );
  const groupsForLayout = archiveView ? groupsSortedArchived : groupsSortedMain;
  const groupsForSelect = groupsForLayout;

  const layoutSections = useMemo(() => {
    const sections: Array<
      | { kind: 'group'; group: ContractEstimateGroup; items: ContractEstimatePreset[] }
      | { kind: 'ungrouped'; items: ContractEstimatePreset[] }
      | { kind: 'soloArchived'; items: ContractEstimatePreset[] }
    > = [];

    if (archiveView) {
      for (const group of groupsForLayout) {
        const inGroup = visibleItems.filter((it) => it.groupId === group.id);
        if (inGroup.length === 0 && attachmentFilter !== 'all') continue;
        sections.push({ kind: 'group', group, items: inGroup });
      }
      const soloArchived = visibleItems.filter((it) => {
        if (!it.groupId || !it.archived) return false;
        const g = groups.find((x) => x.id === it.groupId);
        if (!g) return false;
        return !g.archived;
      });
      if (soloArchived.length > 0) {
        sections.push({ kind: 'soloArchived', items: soloArchived });
      }
      const ungrouped = visibleItems.filter((it) => !it.groupId);
      if (ungrouped.length > 0) {
        sections.push({ kind: 'ungrouped', items: ungrouped });
      }
      return sections;
    }

    const groupIdSet = new Set(groupsForLayout.map((g) => g.id));
    for (const group of groupsForLayout) {
      const inGroup = visibleItems.filter((it) => it.groupId === group.id);
      if (inGroup.length === 0 && attachmentFilter !== 'all') continue;
      sections.push({ kind: 'group', group, items: inGroup });
    }
    const ungrouped = visibleItems.filter((it) => !it.groupId || !groupIdSet.has(it.groupId));
    if (ungrouped.length > 0) {
      sections.push({ kind: 'ungrouped', items: ungrouped });
    }
    return sections;
  }, [groupsForLayout, visibleItems, attachmentFilter, archiveView, groups]);

  const renderEstimateCard = (it: ContractEstimatePreset) => {
    const usages = usageByEstimateId.get(it.id) ?? [];
    const isBound = usages.length > 0;
    const hasLockedUsage = usages.some((u) => isUsageLocked(u));
    const groupForIt = it.groupId ? groups.find((g) => g.id === it.groupId) : undefined;
    const groupArchived = Boolean(groupForIt?.archived);
    const canPresetArchive = !isBound && !it.archived && !groupArchived && !it.groupId;
    const canPresetRestoreFromArchive = Boolean(it.archived) && !groupArchived;
    const primaryUsage = usages[0];
    const primaryLabel = primaryUsage ? formatEstimatePackageUsageLabel(primaryUsage) : '';
    const boundBadgeText = primaryUsage
      ? usages.length > 1
        ? `${primaryLabel} (+${usages.length - 1})`
        : primaryLabel
      : 'Не привязан';
    return (
      <div key={it.id} className={styles.estimatesCard}>
        <div className={styles.estimatesCardMain}>
          <div className={styles.estimatesCardTitleRow}>
            <strong className={styles.estimatesCardTitle}>{it.title}</strong>
            {hasLockedUsage ? (
              <span
                className={styles.estimatesBadge}
                title="Расчёт нельзя редактировать: договор подписан или Д/с подписано"
                aria-label="Расчёт заблокирован для редактирования"
              >
                🔒
              </span>
            ) : null}
            <span
              className={`${styles.estimatesBadge} ${isBound ? styles.estimatesBadgeBound : styles.estimatesBadgeFree}`}
            >
              {isBound ? boundBadgeText : 'Не привязан'}
            </span>
          </div>
          <span className={styles.estimatesCardMeta}>
            {it.categoryName}
            {it.updatedAt ? ` · ${new Date(it.updatedAt).toLocaleString('ru-RU')}` : ''}
          </span>
        </div>
        <label className={`${styles.field} ${styles.estimatesCardGroupField}`}>
          <span>Объект</span>
          <select
            value={it.groupId && groups.some((g) => g.id === it.groupId) ? it.groupId : ''}
            disabled={saving}
            onChange={(e) => assignEstimateToGroup(it.id, e.target.value ? e.target.value : null)}
          >
            <option value="">Не в объекте</option>
            {groupsForSelect.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label
          className={`${styles.field} ${styles.estimatesCardMarkupField}`}
          title={
            hasLockedUsage
              ? 'Нельзя менять наценку: расчёт закрыт для изменений (прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с).'
              : 'Доп. наценка к расчёту, %. Пусто — для расчёта в объекте действует наценка объекта; иначе +% к цене каждой позиции при прикреплении к смете.'
          }
        >
          <span>Наценка, %</span>
          <input
            key={`${it.id}:markup:${it.additionalMarkupPercent ?? 'none'}`}
            type="number"
            min={0}
            max={999}
            step={0.1}
            defaultValue={
              typeof it.additionalMarkupPercent === 'number'
                ? String(it.additionalMarkupPercent)
                : '0'
            }
            disabled={saving || hasLockedUsage}
            onFocus={(e) => {
              e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
            }}
            onBlur={(e) => {
              if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
              updatePresetAdditionalMarkupPercent(it.id, e.target.value);
            }}
          />
        </label>
        <div className={styles.estimatesCardActions}>
          {!archiveView && canPresetArchive ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={saving}
              title="Только для расчёта вне объекта и без привязки к договору. Если расчёт в объекте — используйте «В архив» у объекта или открепите расчёт от объекта."
              onClick={() => setPresetArchived(it.id, true)}
            >
              В архив
            </button>
          ) : null}
          {archiveView && canPresetRestoreFromArchive ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={saving}
              title="Вернуть расчёт в основной список"
              onClick={() => setPresetArchived(it.id, false)}
            >
              Восстановить
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Редактировать"
            title={
              hasLockedUsage
                ? 'Редактирование запрещено: договор подписан или Д/с подписано'
                : 'Редактировать'
            }
            disabled={saving || hasLockedUsage}
            onClick={() => {
              if (hasLockedUsage) return;
              if (usages.length > 0) {
                setDetachEditModal({
                  estimateId: it.id,
                  usages: [...usages],
                });
                return;
              }
              router.push(
                `/admin/contract-documents/estimates/workspace?id=${encodeURIComponent(it.id)}`
              );
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--admin-chart-series-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Копировать расчёт"
            title="Копировать расчёт"
            disabled={saving}
            onClick={() =>
              router.push(
                `/admin/contract-documents/estimates/workspace?copyFrom=${encodeURIComponent(it.id)}`
              )
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--admin-chart-series-2)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Удалить"
            title={
              hasLockedUsage ? 'Удаление запрещено: договор подписан или Д/с подписано' : 'Удалить'
            }
            disabled={saving || hasLockedUsage}
            onClick={() => {
              if (hasLockedUsage) return;
              if (usages.length > 0) {
                setDetachDeleteModal({
                  estimateId: it.id,
                  usages: [...usages],
                });
                return;
              }
              void removeEstimateById(it.id);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--admin-chart-series-6)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} ${styles.pageWide}${archiveView ? ` ${styles.estimatesPageInArchive}` : ''}`}
    >
      <div className={styles.editorHeader}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents">
            ← К разделу «Оформление договоров»
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            {archiveView ? 'Архив расчётов' : 'Расчёты'}
          </h1>
        </div>
        <div className={styles.headerButtonsRow}>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
            disabled={saving || refreshing}
            aria-busy={refreshing}
            aria-label={refreshing ? 'Обновление списка расчётов' : 'Обновить список расчётов'}
            title="Обновить"
            onClick={() => void refreshEstimates()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? styles.estimatesRefreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn} ${styles.estimatesPageArchiveIconBtn}`}
            disabled={saving || refreshing}
            aria-label={
              archiveView
                ? 'Вернуться к основному списку расчётов'
                : 'Архив: объекты и расчёты, отправленные в архив'
            }
            title={
              archiveView
                ? 'Вернуться к основному списку расчётов'
                : 'Объекты с расчётами, отправленные в архив'
            }
            onClick={() => setArchiveView((v) => !v)}
          >
            {archiveView ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 8v13H3V8" />
                <path d="M23 3v5H1V3z" />
                <path d="M10 12h4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div
        className={`${styles.sectionCard} ${styles.estimatesListSection}${archiveView ? ` ${styles.estimatesListSectionArchive}` : ''}`}
        style={{ marginBottom: 10 }}
      >
        <div
          className={`${styles.estimatesControlsSingleRow}${archiveView ? ` ${styles.estimatesControlsSingleRowArchive}` : ''}`}
        >
          {!archiveView ? (
            <>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesGenerateFromMeasurementBtn}`}
                disabled={saving || refreshing}
                onClick={() => void openGenerateFromMeasurementModal()}
              >
                Создать расчёт из замера
              </button>
              <Link
                className={`${styles.primaryBtn} ${styles.estimatesCompactPrimaryLink}`}
                href="/admin/contract-documents/estimates/workspace"
                style={{ textDecoration: 'none' }}
              >
                Создать расчёт
              </Link>
            </>
          ) : null}
          <EstimatesAttachmentFilterControl
            value={attachmentFilter}
            onChange={setAttachmentFilter}
            disabled={saving}
          />
          <div className={styles.estimatesFilterRowSpacer} aria-hidden />
          {!archiveView ? (
            <div className={styles.estimatesFilterRowTrailing}>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesAddObjectBtn}`}
                disabled={saving}
                onClick={createObjectGroup}
              >
                Добавить объект
              </button>
            </div>
          ) : null}
        </div>
        <div
          className={`${styles.estimatesSectionsStack}${archiveView ? ` ${styles.estimatesSectionsStackArchive}` : ''}`}
        >
          {visibleItems.length === 0 ? (
            <p className={styles.hint} style={{ margin: 0 }}>
              {archiveView && !hasAnythingInArchive
                ? 'В архиве пока нет расчётов и объектов.'
                : 'Нет расчётов для текущего фильтра.'}
            </p>
          ) : (
            layoutSections.map((section) => {
              if (section.kind === 'group') {
                const groupCollapsed = collapsedGroupIds.has(section.group.id);
                const allInGroup = items.filter((it) => it.groupId === section.group.id);
                const totalInGroup = allInGroup.length;
                const boundInGroup = allInGroup.filter(
                  (it) => (usageByEstimateId.get(it.id)?.length ?? 0) > 0
                ).length;
                return (
                  <div
                    key={section.group.id}
                    className={`${styles.estimatesGroupBlock} ${boundInGroup > 0 ? styles.estimatesGroupBlockHasBound : ''}`}
                  >
                    <div
                      className={`${styles.estimatesGroupHeader} ${groupCollapsed ? styles.estimatesGroupHeaderCollapsed : ''}`}
                    >
                      <button
                        type="button"
                        className={`${styles.secondaryBtn} ${styles.estimatesGroupCollapseBtn}`}
                        aria-expanded={!groupCollapsed}
                        aria-label={
                          groupCollapsed ? 'Развернуть расчёты объекта' : 'Свернуть расчёты объекта'
                        }
                        title={groupCollapsed ? 'Развернуть' : 'Свернуть'}
                        disabled={saving}
                        onClick={() => toggleGroupCollapsed(section.group.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`${styles.estimatesGroupCollapseChevron}${groupCollapsed ? ` ${styles.estimatesGroupCollapseChevronFolded}` : ''}`}
                          aria-hidden
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      <label className={`${styles.field} ${styles.estimatesGroupTitleField}`}>
                        <span>Название объекта</span>
                        <input
                          key={`${section.group.id}:${section.group.title}`}
                          defaultValue={section.group.title}
                          disabled={saving}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== section.group.title) {
                              renameObjectGroup(section.group.id, v);
                            }
                          }}
                        />
                      </label>
                      <label
                        className={`${styles.field} ${styles.estimatesGroupTitleField}`}
                        style={{ maxWidth: 150 }}
                      >
                        <span>Доп. наценка, %</span>
                        <input
                          key={`${section.group.id}:markup:${section.group.additionalMarkupPercent ?? 'none'}`}
                          type="number"
                          min={0}
                          max={999}
                          step={0.1}
                          defaultValue={
                            typeof section.group.additionalMarkupPercent === 'number'
                              ? String(section.group.additionalMarkupPercent)
                              : '0'
                          }
                          disabled={saving || groupIdsWithLockedEstimate.has(section.group.id)}
                          title={
                            groupIdsWithLockedEstimate.has(section.group.id)
                              ? 'Нельзя менять наценку объекта: в группе есть расчёт, прикреплённый к пакету со статусом «Договор подписан» или к подписанному Д/с.'
                              : 'На все расчёты этого объекта: +% к цене каждой позиции в смете'
                          }
                          onFocus={(e) => {
                            e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
                          }}
                          onBlur={(e) => {
                            if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value)
                              return;
                            updateGroupAdditionalMarkupPercent(section.group.id, e.target.value);
                          }}
                        />
                      </label>
                      <span className={styles.estimatesGroupCount}>
                        Расчётов: {totalInGroup} · привязано: {boundInGroup}
                      </span>
                      {!archiveView && totalInGroup > 0 ? (
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          disabled={saving}
                          title="Скрыть объект из основного списка и из выбора при оформлении договоров"
                          onClick={() => setGroupArchived(section.group.id, true)}
                        >
                          В архив
                        </button>
                      ) : null}
                      {archiveView ? (
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          disabled={saving}
                          title="Вернуть объект в основной список и в выбор при оформлении договоров"
                          onClick={() => setGroupArchived(section.group.id, false)}
                        >
                          Восстановить
                        </button>
                      ) : null}
                      {totalInGroup === 0 ? (
                        <button
                          type="button"
                          className={`${styles.dangerBtn} ${styles.estimatesGroupDangerBtn}`}
                          disabled={saving}
                          title="Удалить пустой объект"
                          onClick={() => removeObjectGroup(section.group.id)}
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>
                    {!groupCollapsed ? (
                      <div className={styles.estimatesCardsStack}>
                        {section.items.length === 0 ? (
                          <p className={styles.estimatesEmptyInGroup}>
                            В этом объекте нет расчётов для текущего фильтра.
                          </p>
                        ) : (
                          section.items.map((it) => renderEstimateCard(it))
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              }
              if (section.kind === 'soloArchived') {
                return (
                  <div key="_soloArchived" className={styles.estimatesUngroupedBlock}>
                    <h4 className={styles.estimatesUngroupedHeading}>
                      В архиве отдельно (объект в основном списке)
                    </h4>
                    <div className={styles.estimatesCardsStack}>
                      {section.items.map((it) => renderEstimateCard(it))}
                    </div>
                  </div>
                );
              }
              return (
                <div key="_ungrouped" className={styles.estimatesUngroupedBlock}>
                  <h4 className={styles.estimatesUngroupedHeading}>Вне объекта</h4>
                  <div className={styles.estimatesCardsStack}>
                    {section.items.map((it) => renderEstimateCard(it))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {detachEditModal ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detach-edit-estimate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setDetachEditModal(null);
            }
          }}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="detach-edit-estimate-title" className={styles.saveModalTitle}>
              Редактирование расчёта
            </h3>
            <p className={styles.saveModalText}>
              Этот расчёт прикреплён к смете договора или к дополнительному соглашению. После
              сохранения изменений его нужно будет заново прикрепить в пакете документов. Текущая
              привязка будет снята автоматически. Продолжить?
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={saving}
                onClick={() => setDetachEditModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving}
                onClick={() => void handleConfirmDetachEdit()}
              >
                {saving ? 'Подождите…' : 'Продолжить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detachDeleteModal ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detach-delete-estimate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setDetachDeleteModal(null);
            }
          }}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="detach-delete-estimate-title" className={styles.saveModalTitle}>
              Удаление расчёта
            </h3>
            <p className={styles.saveModalText}>
              Этот расчёт прикреплён к смете договора или к дополнительному соглашению. При удалении
              привязка будет снята автоматически, расчёт исчезнет из общего списка. Его нужно будет
              заново создать и прикрепить в пакете документов, если он снова понадобится. Удалить?
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={saving}
                onClick={() => setDetachDeleteModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={saving}
                onClick={() => void handleConfirmDetachDelete()}
              >
                {saving ? 'Подождите…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isGenerateFromMeasurementOpen ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-from-measurement-title"
          onClick={() => setIsGenerateFromMeasurementOpen(false)}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.saveModalTitle} id="generate-from-measurement-title">
              Создание расчёта из выполненного замера
            </h3>
            {completedMeasurementsBusy ? (
              <p className={styles.hint}>Загрузка выполненных замеров…</p>
            ) : completedMeasurements.length === 0 ? (
              <p className={styles.hint}>
                Нет выполненных замеров с данными раздела «Замеры помещений».
              </p>
            ) : (
              <label className={styles.field}>
                <span>Выберите выполненный замер</span>
                <select
                  value={selectedMeasurementId}
                  onChange={(e) => setSelectedMeasurementId(e.target.value)}
                >
                  {completedMeasurements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.customerName} · {new Date(m.receptionDate).toLocaleDateString('ru-RU')}
                      {m.customerAddress ? ` · ${m.customerAddress}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={styles.saveModalActionsRow}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setIsGenerateFromMeasurementOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!selectedMeasurementId || completedMeasurementsBusy}
                onClick={() => {
                  if (!selectedMeasurementId) return;
                  router.push(
                    `/admin/contract-documents/estimates/workspace?fromMeasurement=${encodeURIComponent(selectedMeasurementId)}`
                  );
                }}
              >
                Создать расчёт
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
