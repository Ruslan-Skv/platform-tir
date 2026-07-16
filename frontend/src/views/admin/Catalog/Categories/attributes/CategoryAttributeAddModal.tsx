'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import createStyles from '../list/CategoryCreateModal.module.css';
import styles from './CategoryAttributesPage.module.css';
import type { Attribute } from './category-attributes-page.types';
import { attributeTypeBadgeClass, getTypeLabel } from './category-attributes-page.utils';

type CategoryAttributeAddModalProps = {
  open: boolean;
  availableAttributes: Attribute[];
  saving: boolean;
  onClose: () => void;
  onAdd: (attributeIds: string[], asRequired: boolean) => Promise<void>;
};

export function CategoryAttributeAddModal({
  open,
  availableAttributes,
  saving,
  onClose,
  onAdd,
}: CategoryAttributeAddModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [asRequired, setAsRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    setAsRequired(false);
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Выберите хотя бы один атрибут');
      return;
    }
    setError(null);
    try {
      await onAdd(selectedIds, asRequired);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления атрибутов');
    }
  };

  const toggleId = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Добавить существующие атрибуты"
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Привяжите к этой категории атрибут, уже созданный в каталоге. Определение (имя, тип,
          значения) общее — менять его лучше осознанно. Отметьте «Обязательный», чтобы на карточке
          товара поле подсвечивалось и блокировало сохранение без значения.
        </p>

        {availableAttributes.length > 0 ? (
          <>
            <div data-modal-form-group data-modal-span>
              <label className={createStyles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={asRequired}
                  disabled={saving}
                  onChange={(e) => setAsRequired(e.target.checked)}
                />
                <span>Обязательный для товара (для всех выбранных ниже)</span>
              </label>
            </div>

            <div className={styles.attributeSelectList} data-modal-span>
              {availableAttributes.map((attr) => (
                <label key={attr.id} className={styles.attributeSelectItem}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(attr.id)}
                    disabled={saving}
                    onChange={(e) => toggleId(attr.id, e.target.checked)}
                  />
                  <span className={styles.attrName}>{attr.name}</span>
                  <span className={attributeTypeBadgeClass(attr.type)}>
                    {getTypeLabel(attr.type)}
                  </span>
                </label>
              ))}
            </div>

            {error ? <p data-modal-form-error>{error}</p> : null}

            <div data-modal-form-actions>
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={handleClose}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                data-admin-mutation
                type="submit"
                data-modal-btn="primary"
                disabled={saving || selectedIds.length === 0}
              >
                {saving ? 'Добавление…' : `Добавить (${selectedIds.length})`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p data-modal-form-hint>Все атрибуты каталога уже привязаны к этой категории.</p>
            <div data-modal-form-actions>
              <button type="button" data-modal-btn="secondary" onClick={handleClose}>
                Закрыть
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
