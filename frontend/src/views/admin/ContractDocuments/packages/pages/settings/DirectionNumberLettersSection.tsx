'use client';

import { useEffect, useState } from 'react';

import { type CrmDirection, getCrmDirections, updateCrmDirection } from '@/shared/api/admin-crm';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

type DirectionNumberLettersSectionProps = {
  isSuperAdmin: boolean;
  onError: (msg: string | null) => void;
  onOk: (msg: string | null) => void;
};

export function DirectionNumberLettersSection({
  isSuperAdmin,
  onError,
  onOk,
}: DirectionNumberLettersSectionProps) {
  const [items, setItems] = useState<CrmDirection[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await getCrmDirections();
        if (cancelled) return;
        const sorted = list.slice().sort((a, b) => a.sortOrder - b.sortOrder);
        setItems(sorted);
        setDrafts(Object.fromEntries(sorted.map((d) => [d.id, d.numberLetter ?? ''])));
      } catch (e) {
        if (!cancelled)
          onError(e instanceof Error ? e.message : 'Не удалось загрузить направления');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const saveOne = async (id: string) => {
    if (!isSuperAdmin) return;
    setSavingId(id);
    onError(null);
    onOk(null);
    try {
      const updated = await updateCrmDirection(id, {
        numberLetter: drafts[id]?.trim() || null,
      });
      setItems((prev) => prev.map((d) => (d.id === id ? updated : d)));
      onOk(`Буква направления «${updated.name}» сохранена`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={cdTemplates.sectionCard}>
      <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
        Буквы направлений в номере договора
      </h3>
      <p className={cdTemplates.hint} style={{ marginTop: 0 }}>
        Формат: 77/1/3<strong>д</strong>-5 — буква направления (д = Двери, о = Окна, …).
      </p>
      {loading ? (
        <p className={cdTemplates.hint}>Загрузка…</p>
      ) : (
        <div className={cdTemplates.sectionFields}>
          {items.map((d) => (
            <div
              key={d.id}
              className={cdEstimateTab.field}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div style={{ minWidth: 180, flex: 1 }}>
                <label htmlFor={`dir-letter-${d.id}`}>{d.name}</label>
                <input
                  id={`dir-letter-${d.id}`}
                  value={drafts[d.id] ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [d.id]: e.target.value.slice(0, 4) }))
                  }
                  disabled={!isSuperAdmin}
                  placeholder="д"
                  autoComplete="off"
                />
              </div>
              {isSuperAdmin ? (
                <button
                  type="button"
                  className={cdWorkspace.secondaryBtn}
                  disabled={savingId === d.id}
                  onClick={() => void saveOne(d.id)}
                >
                  {savingId === d.id ? '…' : 'Сохранить'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
