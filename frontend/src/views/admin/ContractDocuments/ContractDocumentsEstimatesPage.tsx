'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

import styles from './ContractDocuments.module.css';
import { getDisplayContractDate, getDisplayContractNumber } from './repair/packageContractDisplay';
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
        status: p.status === 'CONTRACT_CONCLUDED' ? 'CONTRACT_CONCLUDED' : 'IN_PROGRESS',
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

  const assignEstimateToGroup = (estimateId: string, groupId: string | null) => {
    const nextItems = items.map((it) => {
      if (it.id !== estimateId) return it;
      if (!groupId) {
        const { groupId: _g, ...rest } = it;
        return rest as ContractEstimatePreset;
      }
      return { ...it, groupId };
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
        await persistRepairPackageAfterRemovingEstimatePreset(u.packageId, it.id, items);
      }
      const packagesRes = await getContractDocumentPackages('REPAIR');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          status: p.status === 'CONTRACT_CONCLUDED' ? 'CONTRACT_CONCLUDED' : 'IN_PROGRESS',
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
        await persistRepairPackageAfterRemovingEstimatePreset(u.packageId, it.id, items);
      }
      const packagesRes = await getContractDocumentPackages('REPAIR');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          status: p.status === 'CONTRACT_CONCLUDED' ? 'CONTRACT_CONCLUDED' : 'IN_PROGRESS',
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
  const visibleItems = useMemo(
    () =>
      itemsSorted.filter((it) => {
        const isBound = (usageByEstimateId.get(it.id)?.length ?? 0) > 0;
        if (attachmentFilter === 'bound') return isBound;
        if (attachmentFilter === 'unbound') return !isBound;
        return true;
      }),
    [itemsSorted, attachmentFilter, usageByEstimateId]
  );

  const groupsSorted = useMemo(() => sortEstimateGroupsByTitle(groups), [groups]);

  const layoutSections = useMemo(() => {
    const groupIdSet = new Set(groups.map((g) => g.id));
    const sections: Array<
      | { kind: 'group'; group: ContractEstimateGroup; items: ContractEstimatePreset[] }
      | { kind: 'ungrouped'; items: ContractEstimatePreset[] }
    > = [];
    for (const group of groupsSorted) {
      const inGroup = visibleItems.filter((it) => it.groupId === group.id);
      if (inGroup.length === 0 && attachmentFilter !== 'all') continue;
      sections.push({ kind: 'group', group, items: inGroup });
    }
    const ungrouped = visibleItems.filter((it) => !it.groupId || !groupIdSet.has(it.groupId));
    if (ungrouped.length > 0) {
      sections.push({ kind: 'ungrouped', items: ungrouped });
    }
    return sections;
  }, [groupsSorted, visibleItems, attachmentFilter]);

  const renderEstimateCard = (it: ContractEstimatePreset) => {
    const usages = usageByEstimateId.get(it.id) ?? [];
    const isBound = usages.length > 0;
    const hasLockedUsage = usages.some((u) => isUsageLocked(u));
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
                title="Расчёт нельзя редактировать: договор заключён или Д/с подписано"
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
            {groupsSorted.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.estimatesCardActions}>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Редактировать"
            title={
              hasLockedUsage
                ? 'Редактирование запрещено: договор заключён или Д/с подписано'
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
              stroke="#2563eb"
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
              stroke="#0d9488"
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
              hasLockedUsage ? 'Удаление запрещено: договор заключён или Д/с подписано' : 'Удалить'
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
              stroke="#dc2626"
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
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={styles.editorHeader}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents">
            ← К разделу «Оформление договоров»
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            Расчёты
          </h1>
          <p className={styles.subtitle} style={{ marginBottom: 12, fontSize: '0.88rem' }}>
            Общие расчёты команды. Несколько расчётов можно объединить в объект (здание / проект).
            Сохраняются на сервере для всей команды.
          </p>
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
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div
        className={`${styles.sectionCard} ${styles.estimatesListSection}`}
        style={{ marginBottom: 10 }}
      >
        <div className={styles.estimatesToolbar}>
          <h3 className={styles.estimatesToolbarTitle}>Список расчётов</h3>
          <Link
            className={`${styles.primaryBtn} ${styles.estimatesCompactPrimaryLink}`}
            href="/admin/contract-documents/estimates/workspace"
            style={{ textDecoration: 'none' }}
          >
            Создать новый расчёт
          </Link>
        </div>
        <div className={styles.estimatesFilterRow}>
          <button
            type="button"
            className={attachmentFilter === 'all' ? styles.primaryBtn : styles.secondaryBtn}
            onClick={() => setAttachmentFilter('all')}
          >
            Все
          </button>
          <button
            type="button"
            className={attachmentFilter === 'bound' ? styles.primaryBtn : styles.secondaryBtn}
            onClick={() => setAttachmentFilter('bound')}
          >
            Только привязанные
          </button>
          <button
            type="button"
            className={attachmentFilter === 'unbound' ? styles.primaryBtn : styles.secondaryBtn}
            onClick={() => setAttachmentFilter('unbound')}
          >
            Только непривязанные
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={saving}
            onClick={createObjectGroup}
          >
            Добавить объект
          </button>
        </div>
        <div className={styles.estimatesSectionsStack}>
          {visibleItems.length === 0 ? (
            <p className={styles.hint} style={{ margin: 0 }}>
              Нет расчётов для текущего фильтра.
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
                      <span className={styles.estimatesGroupCount}>
                        Расчётов: {totalInGroup} · привязано: {boundInGroup}
                      </span>
                      <button
                        type="button"
                        className={`${styles.dangerBtn} ${styles.estimatesGroupDangerBtn}`}
                        disabled={saving}
                        title="Удалить объект; расчёты останутся в списке без группы"
                        onClick={() => removeObjectGroup(section.group.id)}
                      >
                        Удалить
                      </button>
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
    </div>
  );
}
