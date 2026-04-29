'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type ContractSignatoryProfile,
  getContractDocumentSignatoryProfiles,
  putContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import { type CrmUser, getCrmUsers } from '@/shared/api/admin-crm';

import styles from './ContractDocuments.module.css';

const EMPTY_PROFILE: ContractSignatoryProfile = {
  title: '',
  crmUserId: '',
  directorNameNominative: '',
  directorNameGenitive: '',
  basis: '',
  salesOffice: '',
  officePhone: '',
};

function formatCrmUserName(u: CrmUser): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : (u.email ?? '—');
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

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profilesRes, users] = await Promise.all([
          getContractDocumentSignatoryProfiles('REPAIR'),
          getCrmUsers().catch(() => [] as CrmUser[]),
        ]);
        setItems(profilesRes.items ?? []);
        setCrmUsers(users);
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
    try {
      await putContractDocumentSignatoryProfiles({ kind: 'REPAIR', items: nextItems });
      setItems(nextItems);
      setOk('Сохранено.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsert = async () => {
    if (!draft.title?.trim()) {
      setError('Укажите название карточки подписанта.');
      return;
    }
    const next = [...items];
    const normalized: ContractSignatoryProfile = {
      ...draft,
      title: draft.title.trim(),
      crmUserId: draft.crmUserId?.trim() || undefined,
    };
    if (editingIndex === null) next.push(normalized);
    else next[editingIndex] = normalized;
    await saveAll(next);
    resetDraft();
  };

  const handleDelete = async (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    await saveAll(next);
    if (editingIndex === idx) resetDraft();
  };

  const crmUserById = (id: string | undefined) =>
    id ? crmUsers.find((u) => u.id === id) : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.editorHeader}>
        <div>
          <h1 className={styles.title}>Подписанты</h1>
          <p className={styles.subtitle}>
            Карточки подписанта для договоров: ФИО в падежах, основание полномочий, офис продаж.
            Привяжите сотрудника из CRM — это те же пользователи, что в разделе «Менеджеры»; в
            пакете документов менеджер выберет карточку из списка.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <Link className={styles.secondaryBtn} href="/admin/crm/managers">
            Менеджеры CRM
          </Link>
          <Link className={styles.secondaryBtn} href="/admin/contract-documents/repair">
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
            <label>Сотрудник CRM (связь)</label>
            <select
              value={draft.crmUserId ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                setDraft((p) => {
                  const u = crmUsers.find((x) => x.id === id);
                  const suggested = u ? formatCrmUserName(u) : '';
                  const keepNom = p.directorNameNominative?.trim();
                  return {
                    ...p,
                    crmUserId: id || undefined,
                    directorNameNominative: id && !keepNom ? suggested : p.directorNameNominative,
                  };
                });
              }}
            >
              <option value="">— не привязан —</option>
              {crmUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatCrmUserName(u)} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
            <p className={styles.hint} style={{ marginTop: 6, marginBottom: 0 }}>
              Список совпадает с API раздела «Менеджеры». При выборе сотрудника ФИО в им. падеж
              подставляется из CRM, если поле «Подписант (именительный)» было пустым.
            </p>
          </div>
          <div className={styles.field}>
            <label>Подписант (именительный падеж)</label>
            <input
              value={draft.directorNameNominative ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, directorNameNominative: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Подписант (родительный падеж)</label>
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

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>CRM</th>
              <th>Подписант (им.)</th>
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
                <td colSpan={5}>Карточки подписантов пока не добавлены.</td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const linked = crmUserById(item.crmUserId);
                return (
                  <tr key={`${item.title}-${idx}`}>
                    <td>{item.title}</td>
                    <td>{linked ? `${formatCrmUserName(linked)}` : '—'}</td>
                    <td>{item.directorNameNominative || '—'}</td>
                    <td>{item.salesOffice || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => {
                            setDraft({
                              ...item,
                              crmUserId: item.crmUserId ?? '',
                            });
                            setEditingIndex(idx);
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          disabled={saving}
                          onClick={() => void handleDelete(idx)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
