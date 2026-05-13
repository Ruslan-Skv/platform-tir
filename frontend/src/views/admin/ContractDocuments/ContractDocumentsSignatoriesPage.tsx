'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type ContractSignatoryProfile,
  getContractDocumentSignatoryProfiles,
  putContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';

import styles from './ContractDocuments.module.css';

const EMPTY_PROFILE: ContractSignatoryProfile = {
  title: '',
  directorNameNominative: '',
  directorNameGenitive: '',
  basis: '',
  salesOffice: '',
  officePhone: '',
};

type SignatorySortKey = 'title_asc' | 'title_desc';

type SignatoryRowView = { item: ContractSignatoryProfile; originalIndex: number };

function stripCrmFromProfiles(items: ContractSignatoryProfile[]): ContractSignatoryProfile[] {
  return items.map((p) => {
    const { crmUserId: _removed, ...rest } = p;
    return rest;
  });
}

export function ContractDocumentsSignatoriesPage() {
  const [items, setItems] = useState<ContractSignatoryProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContractSignatoryProfile>(EMPTY_PROFILE);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [signatorySort, setSignatorySort] = useState<SignatorySortKey>('title_asc');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const profilesRes = await getContractDocumentSignatoryProfiles('REPAIR');
        setItems(stripCrmFromProfiles(profilesRes.items ?? []));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetDraft = () => {
    setDraft(EMPTY_PROFILE);
    setEditingIndex(null);
  };

  const saveAll = async (nextItems: ContractSignatoryProfile[]) => {
    setSaving(true);
    setError(null);
    setOk(null);
    const sanitized = stripCrmFromProfiles(nextItems);
    try {
      await putContractDocumentSignatoryProfiles({ kind: 'REPAIR', items: sanitized });
      setItems(sanitized);
      setOk('Сохранено.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsert = async () => {
    if (!draft.title?.trim()) {
      setError('Укажите название карточки.');
      return;
    }
    const next = [...items];
    const normalizedDraft: ContractSignatoryProfile = {
      ...draft,
      title: draft.title.trim(),
    };
    const withoutCrm = stripCrmFromProfiles([normalizedDraft])[0];
    if (editingIndex === null) next.push(withoutCrm);
    else next[editingIndex] = withoutCrm;
    await saveAll(next);
    resetDraft();
  };

  const handleDelete = async (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    await saveAll(next);
    if (editingIndex === idx) resetDraft();
  };

  const displayedRows = useMemo((): SignatoryRowView[] => {
    const rows: SignatoryRowView[] = items.map((item, originalIndex) => ({
      item,
      originalIndex,
    }));
    const cmpTitle = (a: SignatoryRowView, b: SignatoryRowView) =>
      (a.item.title || '').localeCompare(b.item.title || '', 'ru', { sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      if (signatorySort === 'title_asc') return cmpTitle(a, b);
      return -cmpTitle(a, b);
    });
  }, [items, signatorySort]);

  return (
    <div className={styles.page}>
      <div className={styles.editorHeader}>
        <div>
          <h1 className={styles.title}>Менеджеры</h1>
          <p className={styles.subtitle}>
            Карточки менеджера для договоров: ФИО в падежах, основание полномочий, офис продаж. В
            пакете документов менеджер выберет карточку из списка.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <Link className={styles.secondaryBtn} href="/admin/contract-documents/contracts/repair">
            К разделу «Ремонт»
          </Link>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.hint}>{ok}</p> : null}

      <div className={styles.sectionCard}>
        <div className={styles.sectionFields}>
          <div className={styles.field}>
            <label>Название карточки</label>
            <input
              value={draft.title ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="Например: «Иванов И.И. — офис X»"
            />
          </div>
          <div className={styles.field}>
            <label>Менеджер (именительный падеж)</label>
            <input
              value={draft.directorNameNominative ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, directorNameNominative: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Менеджер (родительный падеж)</label>
            <input
              value={draft.directorNameGenitive ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, directorNameGenitive: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Действует на основании</label>
            <input
              value={draft.basis ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, basis: e.target.value }))}
              placeholder="Устава, доверенности № …"
            />
          </div>
          <div className={styles.field}>
            <label>Офис продаж</label>
            <input
              value={draft.salesOffice ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, salesOffice: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Телефон офиса</label>
            <input
              value={draft.officePhone ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, officePhone: e.target.value }))}
            />
          </div>
        </div>
        <div className={styles.toolbar} style={{ marginTop: 8, marginBottom: 0 }}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={saving}
            onClick={() => void handleUpsert()}
          >
            {editingIndex === null ? 'Добавить карточку' : 'Сохранить карточку'}
          </button>
          {editingIndex !== null ? (
            <button type="button" className={styles.secondaryBtn} onClick={resetDraft}>
              Отменить редактирование
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={styles.estimatesControlsSingleRow}
        style={{ marginTop: 'var(--admin-space-lg)', marginBottom: 'var(--admin-space-sm)' }}
      >
        <div className={styles.field} style={{ minWidth: 240, flex: '1 1 220px' }}>
          <label htmlFor="signatory_sort">Сортировка</label>
          <select
            id="signatory_sort"
            value={signatorySort}
            onChange={(e) => setSignatorySort(e.target.value as SignatorySortKey)}
            disabled={loading}
          >
            <option value="title_asc">По названию карточки А → Я</option>
            <option value="title_desc">По названию карточки Я → А</option>
          </select>
        </div>
        <div className={styles.estimatesFilterRowSpacer} aria-hidden />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Менеджер (им.)</th>
              <th>Офис</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>Загрузка…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4}>Карточки менеджеров пока не добавлены.</td>
              </tr>
            ) : (
              displayedRows.map(({ item, originalIndex }) => (
                <tr key={`${item.title}-${originalIndex}`}>
                  <td>{item.title}</td>
                  <td>{item.directorNameNominative || '—'}</td>
                  <td>{item.salesOffice || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => {
                          setDraft({ ...item });
                          setEditingIndex(originalIndex);
                        }}
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={saving}
                        onClick={() => void handleDelete(originalIndex)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
