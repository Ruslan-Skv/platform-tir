'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { ApprovedOrderGuardProvider } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { ServiceCategoryPage } from '@/views/services/ui/ServiceCategoryPage/ServiceCategoryPage';

import styles from './ContractDocuments.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number }>;
  }>;
};

type EstimateSnapshot = NonNullable<ContractEstimatePreset['snapshot']>;

function parseDraftRooms(
  draftRaw: string
): Array<{ name: string; items: Array<{ itemId: string; quantity: number }> }> {
  try {
    const parsed = JSON.parse(draftRaw) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return [];
    return parsed.calcs
      .map((calc) => ({
        name: calc.name?.trim() || 'Помещение',
        items: (calc.lines ?? []).filter(
          (line) => line?.itemId && typeof line.quantity === 'number' && line.quantity > 0
        ),
      }))
      .filter((room) => room.items.length > 0);
  } catch {
    return [];
  }
}

async function buildEstimateSnapshot(draftRaw: string): Promise<EstimateSnapshot | null> {
  const rooms = parseDraftRooms(draftRaw);
  if (rooms.length === 0) return null;
  const roomSnapshots = await Promise.all(
    rooms.map(async (room) => {
      const res = await fetch(`${API_URL}/service-catalog/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: room.items }),
      });
      if (!res.ok) {
        return {
          name: room.name,
          total: 0,
          lines: room.items.map((item) => ({
            name: `Позиция ${item.itemId}`,
            unit: 'ед.',
            quantity: item.quantity,
            price: 0,
            amount: 0,
          })),
        };
      }
      const data = (await res.json()) as {
        total?: number;
        lines?: Array<{
          name: string;
          unit: string;
          quantity: number;
          price: number;
          amount: number;
        }>;
      };
      return {
        name: room.name,
        total: typeof data.total === 'number' ? data.total : 0,
        lines: Array.isArray(data.lines)
          ? data.lines.map((line) => ({
              name: line.name,
              unit: line.unit,
              quantity: line.quantity,
              price: line.price,
              amount: line.amount,
            }))
          : [],
      };
    })
  );
  return {
    rooms: roomSnapshots,
    total: roomSnapshots.reduce((sum, room) => sum + room.total, 0),
  };
}

export function ContractDocumentsEstimatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [repairPackages, setRepairPackages] = useState<
    Array<{
      id: string;
      title: string | null;
      formData: Record<string, unknown>;
      crmContract?: { contractNumber: string; contractDate: string } | null;
    }>
  >([]);
  const [estimateCategories, setEstimateCategories] = useState<
    Array<{ slug: string; name: string }>
  >([]);
  const [estimateCategorySlug, setEstimateCategorySlug] = useState('');
  const [estimateNameDraft, setEstimateNameDraft] = useState('');
  const [selectedEstimateId, setSelectedEstimateId] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [showOnlyBound, setShowOnlyBound] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [presetsRes, categoriesRes, packagesRes] = await Promise.all([
          getContractDocumentEstimatePresets('REPAIR'),
          fetch(`${API_URL}/service-catalog`),
          getContractDocumentPackages('REPAIR'),
        ]);
        setItems(presetsRes.items ?? []);
        setRepairPackages(
          (packagesRes ?? []).map((p) => ({
            id: p.id,
            title: p.title ?? null,
            formData: (p.formData ?? {}) as Record<string, unknown>,
            crmContract: p.crmContract
              ? {
                  contractNumber: p.crmContract.contractNumber,
                  contractDate: p.crmContract.contractDate,
                }
              : null,
          }))
        );

        if (categoriesRes.ok) {
          const data = (await categoriesRes.json()) as {
            categories?: Array<{ slug: string; name: string }>;
          };
          const cats = (data.categories ?? [])
            .map((c) => ({ slug: c.slug, name: c.name }))
            .filter((c) => c.slug);
          setEstimateCategories(cats);
          if (cats[0]) setEstimateCategorySlug(cats[0].slug);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistItems = async (next: ContractEstimatePreset[]) => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await putContractDocumentEstimatePresets({ kind: 'REPAIR', items: next });
      setItems(next);
      setOk('Сохранено.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentEstimate = async () => {
    if (!estimateCategorySlug) {
      setError('Выберите категорию работ.');
      return;
    }
    const key = `public.service-catalog.category.calculator-draft.${encodeURIComponent(estimateCategorySlug)}`;
    const draft = window.localStorage.getItem(key);
    if (!draft) {
      setError('Нет данных калькулятора для выбранной категории.');
      return;
    }
    const categoryName =
      estimateCategories.find((c) => c.slug === estimateCategorySlug)?.name ?? estimateCategorySlug;
    const title = estimateNameDraft.trim() || `Расчёт ${new Date().toLocaleString('ru-RU')}`;
    const id = `est_${Date.now()}`;
    const nextItem: ContractEstimatePreset = {
      id,
      title,
      categorySlug: estimateCategorySlug,
      categoryName,
      calculatorDraft: draft,
      snapshot: await buildEstimateSnapshot(draft),
      updatedAt: new Date().toISOString(),
    };
    const next = [nextItem, ...items].slice(0, 200);
    setSelectedEstimateId(id);
    await persistItems(next);
  };

  const applyEstimateToCalculator = (estimateId: string) => {
    const selected = items.find((it) => it.id === estimateId);
    if (!selected) return;
    const key = `public.service-catalog.category.calculator-draft.${encodeURIComponent(selected.categorySlug)}`;
    window.localStorage.setItem(key, selected.calculatorDraft);
    setEstimateCategorySlug(selected.categorySlug);
    setEstimateNameDraft(selected.title);
    setSelectedEstimateId(selected.id);
    setOk('Расчёт применён в калькулятор.');
  };

  const removeSelectedEstimate = async () => {
    if (!selectedEstimateId) return;
    const next = items.filter((it) => it.id !== selectedEstimateId);
    setSelectedEstimateId('');
    await persistItems(next);
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
    const map = new Map<
      string,
      Array<{
        packageId: string;
        packageTitle: string;
        contractNumber: string;
        contractDate: string;
      }>
    >();
    for (const pkg of repairPackages) {
      const estimateRaw = (pkg.formData?.estimate ?? null) as Record<string, unknown> | null;
      const ids: string[] = [];
      if (estimateRaw && typeof estimateRaw.selectedPresetId === 'string') {
        const legacy = estimateRaw.selectedPresetId.trim();
        if (legacy) ids.push(legacy);
      }
      if (estimateRaw && Array.isArray(estimateRaw.selectedPresetIds)) {
        for (const id of estimateRaw.selectedPresetIds) {
          if (typeof id === 'string' && id.trim()) ids.push(id.trim());
        }
      }
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) continue;
      const row = {
        packageId: pkg.id,
        packageTitle: pkg.title?.trim() || `Пакет ${pkg.id.slice(0, 8)}`,
        contractNumber: pkg.crmContract?.contractNumber ?? '—',
        contractDate: pkg.crmContract?.contractDate
          ? new Date(pkg.crmContract.contractDate).toLocaleDateString('ru-RU')
          : '—',
      };
      for (const presetId of uniqueIds) {
        map.set(presetId, [...(map.get(presetId) ?? []), row]);
      }
    }
    return map;
  }, [repairPackages]);
  const visibleItems = useMemo(
    () =>
      itemsSorted.filter((it) => {
        if (!showOnlyBound) return true;
        return (usageByEstimateId.get(it.id)?.length ?? 0) > 0;
      }),
    [itemsSorted, showOnlyBound, usageByEstimateId]
  );

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
          <p className={styles.subtitle}>
            Общие расчёты команды. Сохраняются на сервере и доступны всем менеджерам.
          </p>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div className={`${styles.sectionCard}`} style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
            Список расчётов
          </h3>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setIsCalculatorOpen((prev) => !prev)}
          >
            {isCalculatorOpen ? 'Скрыть калькулятор' : 'Добавить расчёт'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            type="button"
            className={showOnlyBound ? styles.primaryBtn : styles.secondaryBtn}
            onClick={() => setShowOnlyBound((prev) => !prev)}
          >
            {showOnlyBound ? 'Показывать все' : 'Только привязанные'}
          </button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {visibleItems.length === 0 ? (
            <p className={styles.hint} style={{ margin: 0 }}>
              Нет расчётов для текущего фильтра.
            </p>
          ) : (
            visibleItems.map((it) => {
              const usages = usageByEstimateId.get(it.id) ?? [];
              const isSelected = selectedEstimateId === it.id;
              const isBound = usages.length > 0;
              return (
                <div
                  key={it.id}
                  style={{
                    border: isSelected ? '1px solid #2563eb' : '1px solid #dbe3ef',
                    borderRadius: 8,
                    padding: 10,
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{it.title}</strong>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 999,
                            padding: '2px 8px',
                            border: `1px solid ${isBound ? '#bbf7d0' : '#e5e7eb'}`,
                            background: isBound ? '#ecfdf3' : '#f9fafb',
                            color: isBound ? '#166534' : '#6b7280',
                          }}
                        >
                          {isBound ? `Привязан (${usages.length})` : 'Не привязан'}
                        </span>
                      </div>
                      <div className={styles.hint}>
                        {it.categoryName}
                        {it.updatedAt ? ` · ${new Date(it.updatedAt).toLocaleString('ru-RU')}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => {
                          setSelectedEstimateId(it.id);
                          setEstimateCategorySlug(it.categorySlug);
                          setEstimateNameDraft(it.title);
                        }}
                      >
                        Выбрать
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => {
                          applyEstimateToCalculator(it.id);
                          setIsCalculatorOpen(true);
                        }}
                      >
                        Открыть в калькуляторе
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={saving}
                        onClick={async () => {
                          setSelectedEstimateId(it.id);
                          await removeSelectedEstimate();
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  <div className={styles.hint} style={{ marginTop: 6 }}>
                    {usages.length === 0
                      ? 'Не привязан к договорам'
                      : `Привязан к договорам: ${usages
                          .map((u) => `№ ${u.contractNumber} от ${u.contractDate}`)
                          .join('; ')}`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isCalculatorOpen ? (
        <>
          <div className={`${styles.docToolbar} ${styles.blockImport}`}>
            <label className={styles.field} style={{ minWidth: 260 }}>
              <span>Категория работ</span>
              <select
                value={estimateCategorySlug}
                onChange={(e) => setEstimateCategorySlug(e.target.value)}
              >
                {estimateCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field} style={{ minWidth: 280 }}>
              <span>Название расчёта</span>
              <input
                value={estimateNameDraft}
                onChange={(e) => setEstimateNameDraft(e.target.value)}
                placeholder="Например: ЖК Парк, кв. 54"
              />
            </label>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving}
              onClick={() => void saveCurrentEstimate()}
            >
              {saving ? 'Сохранение…' : 'Сохранить текущий расчёт'}
            </button>
          </div>

          <div className={styles.docPane}>
            {estimateCategorySlug ? (
              <CartProvider>
                <ApprovedOrderGuardProvider>
                  <ServiceCategoryPage slug={estimateCategorySlug} hideAddToCart />
                </ApprovedOrderGuardProvider>
              </CartProvider>
            ) : (
              <p className={styles.hint}>Выберите категорию для работы с калькулятором.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
