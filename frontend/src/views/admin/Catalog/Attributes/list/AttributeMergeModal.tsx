'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AdminAttribute } from '@/shared/api/admin-attributes';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from './AttributesPage.module.css';

type AttributeMergeModalProps = {
  open: boolean;
  /** Характеристика, которую вливаем и удаляем. */
  source: AdminAttribute | null;
  candidates: AdminAttribute[];
  merging: boolean;
  onClose: () => void;
  onMerge: (keepId: string) => Promise<void>;
};

function usageOf(attr: AdminAttribute): number {
  return attr._count?.categories ?? attr.categories?.length ?? 0;
}

function pickDefaultKeepId(source: AdminAttribute, candidates: AdminAttribute[]): string {
  const sameName = candidates.filter(
    (c) => c.name.trim().toLowerCase() === source.name.trim().toLowerCase()
  );
  const pool = sameName.length > 0 ? sameName : candidates;
  const manufacturer = pool.find((c) => c.slug === 'manufacturer');
  if (manufacturer) return manufacturer.id;
  return [...pool].sort((a, b) => usageOf(b) - usageOf(a))[0]?.id ?? '';
}

export function AttributeMergeModal({
  open,
  source,
  candidates,
  merging,
  onClose,
  onMerge,
}: AttributeMergeModalProps) {
  const [keepId, setKeepId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    if (!source) return [];
    const sameName: AdminAttribute[] = [];
    const other: AdminAttribute[] = [];
    for (const c of candidates) {
      if (c.id === source.id) continue;
      if (c.name.trim().toLowerCase() === source.name.trim().toLowerCase()) sameName.push(c);
      else other.push(c);
    }
    const byUsage = (a: AdminAttribute, b: AdminAttribute) => usageOf(b) - usageOf(a);
    return [...sameName.sort(byUsage), ...other.sort(byUsage)];
  }, [candidates, source]);

  useEffect(() => {
    if (!open || !source) return;
    setKeepId(pickDefaultKeepId(source, options));
    setError(null);
  }, [open, source, options]);

  const keep = options.find((c) => c.id === keepId) ?? null;

  const handleClose = () => {
    if (merging) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !keepId) {
      setError('Выберите характеристику, в которую влить');
      return;
    }
    setError(null);
    try {
      await onMerge(keepId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка объединения');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Объединить характеристики"
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        {source ? (
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Вливаем «{source.name}» <span className={styles.slugCell}>({source.slug})</span> —{' '}
            {usageOf(source)} привязок. Она будет удалена. Привязки категорий, фильтры, варианты и
            значения в товарах (по slug) перенесутся в выбранную характеристику.
          </p>
        ) : null}

        {source?.slug === 'manufacturer' ? (
          <p className={styles.mergeTip}>
            Сейчас будет удалён slug <code>manufacturer</code>. Обычно делают наоборот: нажимают
            «Объединить» у дубликата (<code>proizvoditel</code>) и оставляют{' '}
            <code>manufacturer</code> — он связан со справочником производителей.
          </p>
        ) : keep?.slug === 'manufacturer' || options.some((c) => c.slug === 'manufacturer') ? (
          <p className={styles.mergeTip}>
            Для «Производитель» лучше оставить slug <code>manufacturer</code> — он связан со
            справочником производителей.
          </p>
        ) : null}

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="attr-merge-keep">Оставить (в неё вливаем) *</label>
            <select
              id="attr-merge-keep"
              value={keepId}
              disabled={merging || options.length === 0}
              onChange={(e) => setKeepId(e.target.value)}
            >
              {options.length === 0 ? <option value="">Нет других характеристик</option> : null}
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug}) — {usageOf(c)} кат.
                  {c.name.trim().toLowerCase() === source?.name.trim().toLowerCase()
                    ? ' · то же имя'
                    : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={merging}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={merging || !keepId}
          >
            {merging ? 'Объединение…' : 'Объединить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
