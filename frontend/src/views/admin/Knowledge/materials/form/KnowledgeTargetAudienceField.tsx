'use client';

import { useCallback, useState } from 'react';

import {
  type KnowledgeTargetAudience,
  createKnowledgeTargetAudience,
} from '@/shared/api/admin-knowledge';

import styles from './KnowledgeTargetAudienceField.module.css';

type KnowledgeTargetAudienceFieldProps = {
  options: KnowledgeTargetAudience[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onOptionsChange: (options: KnowledgeTargetAudience[]) => void;
  disabled?: boolean;
};

export function KnowledgeTargetAudienceField({
  options,
  selectedIds,
  onSelectedIdsChange,
  onOptionsChange,
  disabled = false,
}: KnowledgeTargetAudienceFieldProps) {
  const [pickId, setPickId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = options.filter((o) => selectedIds.includes(o.id));
  const available = options.filter((o) => !selectedIds.includes(o.id));

  const addSelected = useCallback(
    (id: string) => {
      if (!id || selectedIds.includes(id)) return;
      onSelectedIdsChange([...selectedIds, id]);
      setPickId('');
      setError(null);
    },
    [onSelectedIdsChange, selectedIds]
  );

  const removeSelected = useCallback(
    (id: string) => {
      onSelectedIdsChange(selectedIds.filter((item) => item !== id));
    },
    [onSelectedIdsChange, selectedIds]
  );

  const handleAddFromList = () => {
    if (!pickId) return;
    addSelected(pickId);
  };

  const handleCreateOption = async () => {
    const label = newLabel.trim();
    if (!label) {
      setError('Введите название аудитории');
      return;
    }
    const existing = options.find((o) => o.label.toLowerCase() === label.toLowerCase());
    if (existing) {
      addSelected(existing.id);
      setNewLabel('');
      setError(null);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const created = await createKnowledgeTargetAudience(label);
      const nextOptions = [...options, created].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.label.localeCompare(b.label, 'ru');
      });
      onOptionsChange(nextOptions);
      onSelectedIdsChange([...selectedIds, created.id]);
      setNewLabel('');
      setPickId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось добавить вариант');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.controlsRow}>
        {selected.map((item) => (
          <span key={item.id} className={styles.chip}>
            {item.label}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => removeSelected(item.id)}
              disabled={disabled}
              aria-label={`Убрать «${item.label}»`}
            >
              ×
            </button>
          </span>
        ))}
        <select
          id="targetAudiencePick"
          className={styles.select}
          value={pickId}
          onChange={(e) => {
            setPickId(e.target.value);
            setError(null);
          }}
          disabled={disabled || available.length === 0}
          aria-label="Выбрать из списка"
        >
          <option value="">
            {available.length === 0 ? 'Все варианты уже выбраны' : 'Выберите из списка…'}
          </option>
          {available.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={handleAddFromList}
          disabled={disabled || !pickId}
        >
          Добавить
        </button>
        <input
          type="text"
          className={styles.input}
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreateOption();
            }
          }}
          placeholder="Новый вариант аудитории"
          disabled={disabled || adding}
          aria-label="Новый вариант целевой аудитории"
        />
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => void handleCreateOption()}
          disabled={disabled || adding || !newLabel.trim()}
        >
          {adding ? '…' : '+'}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
