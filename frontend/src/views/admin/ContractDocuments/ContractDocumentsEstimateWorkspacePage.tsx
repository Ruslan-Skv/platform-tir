'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { ApprovedOrderGuardProvider } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { ServiceCategoryPage } from '@/views/services/ui/ServiceCategoryPage/ServiceCategoryPage';

import styles from './ContractDocuments.module.css';
import { buildEstimateSnapshot } from './repair/contractDocumentsEstimateSnapshot';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function applyPresetToLocalCalculator(preset: ContractEstimatePreset) {
  const key = `public.service-catalog.category.calculator-draft.${encodeURIComponent(preset.categorySlug)}`;
  window.localStorage.setItem(key, preset.calculatorDraft);
}

function calculatorDraftStorageKey(categorySlug: string) {
  return `public.service-catalog.category.calculator-draft.${encodeURIComponent(categorySlug)}`;
}

/** Как в `ServiceCategoryPage`: свёрнутые группы видов работ по категории. */
function calculatorWorkGroupsStorageKey(categorySlug: string) {
  return `public.service-catalog.category.work-groups.${encodeURIComponent(categorySlug)}`;
}

/** Новый расчёт: не подтягивать черновики с публичного каталога / прошлых сессий. */
function clearStoredCalculatorStateForNewEstimate(categorySlugs: string[]) {
  if (typeof window === 'undefined') return;
  for (const slug of categorySlugs) {
    if (!slug) continue;
    try {
      window.localStorage.removeItem(calculatorDraftStorageKey(slug));
      window.localStorage.removeItem(calculatorWorkGroupsStorageKey(slug));
    } catch {
      // квота / приватный режим
    }
  }
}

type WorkspaceBaseline = {
  categorySlug: string;
  name: string;
  draft: string | null;
};

const ESTIMATES_LIST_HREF = '/admin/contract-documents/estimates';

function ContractDocumentsEstimateWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const estimateIdFromUrl = searchParams.get('id');
  const copyFromId = searchParams.get('copyFrom');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [estimateGroups, setEstimateGroups] = useState<ContractEstimateGroup[]>([]);
  const [estimateCategories, setEstimateCategories] = useState<
    Array<{ slug: string; name: string }>
  >([]);
  const [estimateCategorySlug, setEstimateCategorySlug] = useState('');
  const [estimateNameDraft, setEstimateNameDraft] = useState('');
  const [selectedEstimateId, setSelectedEstimateId] = useState('');
  const [baseline, setBaseline] = useState<WorkspaceBaseline | null>(null);
  const [draftPollTick, setDraftPollTick] = useState(0);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  /** Пока true — считаем черновик несохранённым (режим «копия»), чтобы была кнопка «Сохранить». */
  const [copySessionPendingSave, setCopySessionPendingSave] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      setOk(null);
      setBaseline(null);
      setCopySessionPendingSave(false);
      try {
        const [presetsRes, categoriesRes] = await Promise.all([
          getContractDocumentEstimatePresets('REPAIR'),
          fetch(`${API_URL}/service-catalog`),
        ]);
        const loadedItems = presetsRes.items ?? [];
        setItems(loadedItems);
        setEstimateGroups(presetsRes.groups ?? []);

        let cats: Array<{ slug: string; name: string }> = [];
        if (categoriesRes.ok) {
          const data = (await categoriesRes.json()) as {
            categories?: Array<{ slug: string; name: string }>;
          };
          cats = (data.categories ?? [])
            .map((c) => ({ slug: c.slug, name: c.name }))
            .filter((c) => c.slug);
          setEstimateCategories(cats);
        }

        let baselineSlug = '';
        let baselineName = '';

        if (copyFromId) {
          const source = loadedItems.find((item) => item.id === copyFromId);
          if (source) {
            clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
            applyPresetToLocalCalculator(source);
            setEstimateCategorySlug(source.categorySlug);
            const copyTitle = `${source.title.trim() || 'Расчёт'} (копия)`;
            setEstimateNameDraft(copyTitle);
            setSelectedEstimateId('');
            baselineSlug = source.categorySlug;
            baselineName = copyTitle;
            setCopySessionPendingSave(true);
          } else {
            setError('Исходный расчёт не найден. Вернитесь к списку и обновите страницу.');
            clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
            setSelectedEstimateId('');
            setEstimateNameDraft('');
            if (cats[0]) setEstimateCategorySlug(cats[0].slug);
            baselineSlug = cats[0]?.slug ?? '';
            baselineName = '';
          }
        } else if (estimateIdFromUrl) {
          const preset = loadedItems.find((it) => it.id === estimateIdFromUrl);
          if (preset) {
            applyPresetToLocalCalculator(preset);
            setEstimateCategorySlug(preset.categorySlug);
            setEstimateNameDraft(preset.title);
            setSelectedEstimateId(preset.id);
            baselineSlug = preset.categorySlug;
            baselineName = preset.title;
          } else {
            setError('Расчёт не найден. Вернитесь к списку и обновите страницу.');
            setSelectedEstimateId('');
            setEstimateNameDraft('');
            if (cats[0]) setEstimateCategorySlug(cats[0].slug);
            baselineSlug = cats[0]?.slug ?? '';
            baselineName = '';
          }
        } else {
          clearStoredCalculatorStateForNewEstimate(cats.map((c) => c.slug));
          setSelectedEstimateId('');
          setEstimateNameDraft('');
          if (cats[0]) setEstimateCategorySlug(cats[0].slug);
          baselineSlug = cats[0]?.slug ?? '';
          baselineName = '';
        }

        const baselineKey = baselineSlug ? calculatorDraftStorageKey(baselineSlug) : '';
        const baselineDraft = baselineKey ? window.localStorage.getItem(baselineKey) : null;
        setBaseline({
          categorySlug: baselineSlug,
          name: baselineName,
          draft: baselineDraft,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, [estimateIdFromUrl, copyFromId]);

  useEffect(() => {
    const id = window.setInterval(() => setDraftPollTick((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!baseline && !copySessionPendingSave) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (copySessionPendingSave) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      if (!baseline) return;
      const key = estimateCategorySlug ? calculatorDraftStorageKey(estimateCategorySlug) : '';
      const draft = key ? window.localStorage.getItem(key) : null;
      const isDirty =
        estimateCategorySlug !== baseline.categorySlug ||
        estimateNameDraft !== baseline.name ||
        (draft ?? '') !== (baseline.draft ?? '');
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [baseline, copySessionPendingSave, estimateCategorySlug, estimateNameDraft]);

  const dirty = useMemo(() => {
    if (copySessionPendingSave) return true;
    if (!baseline) return false;
    const key = estimateCategorySlug ? calculatorDraftStorageKey(estimateCategorySlug) : '';
    const draft = key ? window.localStorage.getItem(key) : null;
    return (
      estimateCategorySlug !== baseline.categorySlug ||
      estimateNameDraft !== baseline.name ||
      (draft ?? '') !== (baseline.draft ?? '')
    );
  }, [copySessionPendingSave, baseline, estimateCategorySlug, estimateNameDraft, draftPollTick]);

  const isEditingExisting =
    Boolean(selectedEstimateId) && items.some((it) => it.id === selectedEstimateId);

  const abandonChangesAndLeave = () => {
    if (baseline?.categorySlug) {
      const k = calculatorDraftStorageKey(baseline.categorySlug);
      if (baseline.draft !== null) window.localStorage.setItem(k, baseline.draft);
      else window.localStorage.removeItem(k);
    }
    setExitConfirmOpen(false);
    router.push(ESTIMATES_LIST_HREF);
  };

  const persistItems = async (next: ContractEstimatePreset[]): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await putContractDocumentEstimatePresets({
        kind: 'REPAIR',
        items: next,
        groups: estimateGroups,
      });
      setItems(next);
      setOk('Сохранено.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
      return false;
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

    const existing = selectedEstimateId
      ? items.find((it) => it.id === selectedEstimateId)
      : undefined;

    const nextItem: ContractEstimatePreset = {
      id: existing?.id ?? `est_${Date.now()}`,
      title,
      categorySlug: estimateCategorySlug,
      categoryName,
      calculatorDraft: draft,
      snapshot: await buildEstimateSnapshot(draft),
      updatedAt: new Date().toISOString(),
      ...(existing?.groupId ? { groupId: existing.groupId } : {}),
    };

    const next = existing
      ? items.map((it) => (it.id === existing.id ? nextItem : it))
      : [nextItem, ...items].slice(0, 200);

    setSelectedEstimateId(nextItem.id);
    const saved = await persistItems(next);
    if (saved) {
      setCopySessionPendingSave(false);
      router.push('/admin/contract-documents/estimates');
    }
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
          <Link
            className={styles.backLink}
            href={ESTIMATES_LIST_HREF}
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setExitConfirmOpen(true);
              }
            }}
          >
            ← К списку расчётов
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            {estimateIdFromUrl
              ? 'Редактирование расчёта'
              : copyFromId
                ? 'Новый расчёт по копии'
                : 'Новый расчёт'}
          </h1>
          <p className={styles.subtitle}>
            Калькулятор сметы. Сохранение появляется только при изменениях в названии, категории или
            смете; затем вы вернётесь к списку общих расчётов.
          </p>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div className={`${styles.docToolbar} ${styles.blockImport}`} style={{ marginBottom: 12 }}>
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
        {dirty ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving}
              onClick={() => void saveCurrentEstimate()}
            >
              {saving
                ? 'Сохранение…'
                : isEditingExisting
                  ? 'Сохранить изменения'
                  : 'Сохранить расчёт'}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={saving}
              onClick={() => setExitConfirmOpen(true)}
            >
              Выйти без сохранения
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.docPane}>
        {estimateCategorySlug ? (
          <CartProvider>
            <ApprovedOrderGuardProvider>
              <ServiceCategoryPage
                key={estimateCategorySlug}
                slug={estimateCategorySlug}
                hideAddToCart
              />
            </ApprovedOrderGuardProvider>
          </CartProvider>
        ) : (
          <p className={styles.hint}>Выберите категорию для работы с калькулятором.</p>
        )}
      </div>

      {exitConfirmOpen ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="estimate-exit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExitConfirmOpen(false);
          }}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="estimate-exit-title" className={styles.saveModalTitle}>
              Выйти без сохранения?
            </h3>
            <p className={styles.saveModalText}>
              Несохранённые изменения в расчёте будут отменены. Для расчёта, открытого из списка,
              черновик калькулятора вернётся к состоянию на момент открытия страницы.
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
                onClick={() => setExitConfirmOpen(false)}
              >
                Отмена
              </button>
              <button type="button" className={styles.primaryBtn} onClick={abandonChangesAndLeave}>
                Выйти без сохранения
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ContractDocumentsEstimateWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <p className={styles.hint}>Загрузка…</p>
        </div>
      }
    >
      <ContractDocumentsEstimateWorkspaceInner />
    </Suspense>
  );
}
