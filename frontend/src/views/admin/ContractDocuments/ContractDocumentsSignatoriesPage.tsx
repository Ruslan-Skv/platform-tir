'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type ContractSignatoryProfile,
  getContractDocumentSignatoryProfiles,
  putContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import { type CrmUser, getCrmUsers } from '@/shared/api/admin-crm';

import styles from './ContractDocuments.module.css';

/** Роли, доступные как менеджер в замерах и фильтрах списка. */
const MANAGER_CRM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

const EMPTY_PROFILE: ContractSignatoryProfile = {
  title: '',
  crmUserId: '',
  directorNameNominative: '',
  directorNameGenitive: '',
  basis: '',
  salesOffice: '',
  officePhone: '',
};

type SignatorySortKey = 'title_asc' | 'title_desc';

type SignatoryRowView = { item: ContractSignatoryProfile; originalIndex: number };

function formatCrmUserLabel(u: CrmUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name ? `${name} (${u.email})` : u.email;
}

function normalizeSignatoryProfile(profile: ContractSignatoryProfile): ContractSignatoryProfile {
  const crmUserId = profile.crmUserId?.trim();
  return {
    ...profile,
    title: profile.title.trim(),
    ...(crmUserId ? { crmUserId } : {}),
  };
}

export function ContractDocumentsSignatoriesPage() {
  const [items, setItems] = useState<ContractSignatoryProfile[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContractSignatoryProfile>(EMPTY_PROFILE);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [signatorySort, setSignatorySort] = useState<SignatorySortKey>('title_asc');

  const managerCrmUsers = useMemo(
    () =>
      crmUsers.filter((u) =>
        MANAGER_CRM_ROLES.includes(u.role as (typeof MANAGER_CRM_ROLES)[number])
      ),
    [crmUsers]
  );

  const crmUserLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of crmUsers) {
      map.set(u.id, formatCrmUserLabel(u));
    }
    return map;
  }, [crmUsers]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profilesRes, users] = await Promise.all([
          getContractDocumentSignatoryProfiles('REPAIR'),
          getCrmUsers().catch(() => [] as CrmUser[]),
        ]);
        setCrmUsers(users);
        setItems(profilesRes.items ?? []);
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
    const sanitized = nextItems.map(normalizeSignatoryProfile);
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
    const crmUserId = draft.crmUserId?.trim();
    if (!crmUserId) {
      setError(
        'Выберите пользователя CRM — без привязки карточка не попадёт в фильтр менеджера в замерах.'
      );
      return;
    }
    const duplicateIdx = items.findIndex(
      (p, i) => i !== editingIndex && p.crmUserId?.trim() === crmUserId
    );
    if (duplicateIdx >= 0) {
      setError('Этот пользователь CRM уже привязан к другой карточке менеджера.');
      return;
    }
    const next = [...items];
    const normalizedDraft = normalizeSignatoryProfile(draft);
    if (editingIndex === null) next.push(normalizedDraft);
    else next[editingIndex] = normalizedDraft;
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
            Карточки менеджера для договоров: ФИО в падежах, основание полномочий, офис продаж. Для
            каждой карточки укажите пользователя CRM — по нему карточка попадает в фильтр менеджера
            в замерах. В пакете документов менеджер выберет карточку из списка.
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
            <label htmlFor="signatory_crm_user">Пользователь CRM</label>
            <select
              id="signatory_crm_user"
              value={draft.crmUserId ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, crmUserId: e.target.value }))}
            >
              <option value="">— Выберите сотрудника —</option>
              {managerCrmUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatCrmUserLabel(u)}
                </option>
              ))}
            </select>
            <p className={styles.hint} style={{ marginTop: 4, marginBottom: 0 }}>
              Обязательная привязка к учётной записи CRM для фильтра замеров и поля «Менеджер» в
              бланке замера.
            </p>
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
              <th>Пользователь CRM</th>
              <th>Менеджер (им.)</th>
              <th>Офис</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>Карточки менеджеров пока не добавлены.</td>
              </tr>
            ) : (
              displayedRows.map(({ item, originalIndex }) => (
                <tr key={`${item.title}-${originalIndex}`}>
                  <td>{item.title}</td>
                  <td>
                    {item.crmUserId
                      ? (crmUserLabelById.get(item.crmUserId) ?? item.crmUserId)
                      : '— не привязан —'}
                  </td>
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
