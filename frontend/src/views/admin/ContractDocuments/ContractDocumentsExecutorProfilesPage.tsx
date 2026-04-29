'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type ExecutorRequisiteKind,
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  putContractDocumentExecutorProfiles,
} from '@/shared/api/admin-contract-document-packages';

import styles from './ContractDocuments.module.css';

const EMPTY_PROFILE: ExecutorRequisiteProfile = {
  title: '',
  kind: 'COMPANY',
  companyName: '',
  inn: '',
  kpp: '',
  ogrn: '',
  ogrnip: '',
  legalAddress: '',
  actualAddress: '',
  bankDetails: '',
  email: '',
};

export function ContractDocumentsExecutorProfilesPage() {
  const [items, setItems] = useState<ExecutorRequisiteProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExecutorRequisiteProfile>(EMPTY_PROFILE);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getContractDocumentExecutorProfiles('REPAIR');
        setItems(res.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить реквизиты');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetDraft = () => {
    setDraft(EMPTY_PROFILE);
    setEditingIndex(null);
  };

  const saveAll = async (nextItems: ExecutorRequisiteProfile[]) => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await putContractDocumentExecutorProfiles({ kind: 'REPAIR', items: nextItems });
      setItems(nextItems);
      setOk('Сохранено.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить реквизиты');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsert = async () => {
    if (!draft.title?.trim()) {
      setError('Укажите название набора реквизитов.');
      return;
    }
    const next = [...items];
    const kind: ExecutorRequisiteKind = draft.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
    const normalized: ExecutorRequisiteProfile = {
      ...draft,
      title: draft.title.trim(),
      kind,
      kpp: kind === 'ENTREPRENEUR' ? '' : (draft.kpp ?? ''),
      ogrn: kind === 'ENTREPRENEUR' ? '' : (draft.ogrn ?? ''),
      ogrnip: kind === 'ENTREPRENEUR' ? (draft.ogrnip ?? '') : '',
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

  return (
    <div className={styles.page}>
      <div className={styles.editorHeader}>
        <div>
          <h1 className={styles.title}>Наши реквизиты</h1>
          <p className={styles.subtitle}>
            Создайте наборы реквизитов Исполнителя. Подписанта и офис продаж настройте в разделе{' '}
            <Link className={styles.link} href="/admin/contract-documents/signatories">
              Подписанты
            </Link>
            . В договоре менеджер выберет наборы из списков.
          </p>
        </div>
        <Link className={styles.secondaryBtn} href="/admin/contract-documents/repair">
          К разделу «Ремонт»
        </Link>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.hint}>{ok}</p> : null}

      <div className={styles.sectionCard}>
        <div className={styles.sectionFields}>
          <div className={styles.field}>
            <label>Название набора</label>
            <input
              value={draft.title ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder='Например: "ООО Территория ИР"'
            />
          </div>
          <div className={styles.field}>
            <label>Тип исполнителя</label>
            <select
              value={draft.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY'}
              onChange={(e) => {
                const kind = e.target.value === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
                setDraft((p) =>
                  kind === 'ENTREPRENEUR'
                    ? { ...p, kind, kpp: '', ogrn: '' }
                    : { ...p, kind, ogrnip: '' }
                );
              }}
            >
              <option value="COMPANY">Юридическое лицо (ЮЛ)</option>
              <option value="ENTREPRENEUR">Индивидуальный предприниматель (ИП)</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Наименование организации</label>
            <input
              value={draft.companyName ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, companyName: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>ИНН</label>
            <input
              value={draft.inn ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, inn: e.target.value }))}
            />
          </div>
          {draft.kind === 'ENTREPRENEUR' ? null : (
            <div className={styles.field}>
              <label>КПП</label>
              <input
                value={draft.kpp ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, kpp: e.target.value }))}
              />
            </div>
          )}
          {draft.kind === 'ENTREPRENEUR' ? (
            <div className={styles.field}>
              <label>ОГРНИП</label>
              <input
                value={draft.ogrnip ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, ogrnip: e.target.value }))}
              />
            </div>
          ) : (
            <div className={styles.field}>
              <label>ОГРН</label>
              <input
                value={draft.ogrn ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, ogrn: e.target.value }))}
              />
            </div>
          )}
          <div className={styles.field}>
            <label>E-mail</label>
            <input
              type="email"
              autoComplete="email"
              value={draft.email ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Юридический адрес</label>
            <textarea
              value={draft.legalAddress ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, legalAddress: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>Адрес для корреспонденции</label>
            <textarea
              value={draft.actualAddress ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, actualAddress: e.target.value }))}
            />
          </div>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <label>Банковские реквизиты</label>
            <textarea
              value={draft.bankDetails ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, bankDetails: e.target.value }))}
            />
          </div>
        </div>
        <div className={styles.toolbar} style={{ marginTop: 8, marginBottom: 0 }}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={saving}
            onClick={handleUpsert}
          >
            {editingIndex === null ? 'Добавить набор' : 'Сохранить набор'}
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
              <th>Тип</th>
              <th>Организация</th>
              <th>ИНН</th>
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
                <td colSpan={5}>Наборы реквизитов пока не добавлены.</td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={`${item.title}-${idx}`}>
                  <td>{item.title}</td>
                  <td>{item.kind === 'ENTREPRENEUR' ? 'ИП' : 'ЮЛ'}</td>
                  <td>{item.companyName || '—'}</td>
                  <td>{item.inn || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => {
                          setDraft({
                            ...item,
                            kind: item.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY',
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
