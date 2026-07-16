'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import createStyles from '../list/CategoryCreateModal.module.css';
import {
  AttributeOptionRowsEditor,
  type AttributeOptionRowsEditorMod,
} from './AttributeOptionRowsEditor';
import styles from './CategoryAttributesPage.module.css';
import type { Attribute } from './category-attributes-page.types';
import { generateSlug, isListAttributeType } from './category-attributes-page.utils';

type CreateAttributePayload = {
  name: string;
  slug: string;
  type: Attribute['type'];
  unit: string;
  isFilterable: boolean;
  optionRows: string[];
  linkAsRequired: boolean;
};

type CategoryAttributeCreateModalProps = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onCreate: (payload: CreateAttributePayload) => Promise<void>;
};

const EMPTY_FORM = {
  name: '',
  slug: '',
  type: 'TEXT' as Attribute['type'],
  unit: '',
  isFilterable: true,
  optionRows: [] as string[],
  linkAsRequired: false,
};

export function CategoryAttributeCreateModal({
  open,
  saving,
  onClose,
  onCreate,
}: CategoryAttributeCreateModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [autoSlug, setAutoSlug] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setAutoSlug(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Заполните название и slug');
      return;
    }
    setError(null);
    try {
      await onCreate({
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim(),
        unit: form.unit.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания атрибута');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Новый атрибут"
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
          Создаётся определение атрибута в каталоге и сразу привязывается к этой категории. Если
          атрибут нужен только здесь — больше никуда его не добавляйте. Если он должен быть общим
          для дочерних категорий — создайте его у родителя.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="attr-create-name">Название *</label>
            <input
              id="attr-create-name"
              type="text"
              value={form.name}
              disabled={saving}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: autoSlug ? generateSlug(name) : prev.slug,
                }));
              }}
              placeholder="Например: Материал"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="attr-create-slug">Slug (URL) *</label>
            <input
              id="attr-create-slug"
              type="text"
              value={form.slug}
              disabled={saving}
              onChange={(e) => {
                setAutoSlug(false);
                setForm((prev) => ({
                  ...prev,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                }));
              }}
              placeholder="material"
            />
            {autoSlug ? (
              <span className={createStyles.slugHint}>Формируется автоматически из названия</span>
            ) : null}
          </div>

          <div data-modal-form-group>
            <label htmlFor="attr-create-type">Тип</label>
            <select
              id="attr-create-type"
              value={form.type}
              disabled={saving}
              onChange={(e) => {
                const type = e.target.value as Attribute['type'];
                setForm((prev) => ({
                  ...prev,
                  type,
                  ...(!isListAttributeType(type) ? { optionRows: [] } : {}),
                }));
              }}
            >
              <option value="TEXT">Текст</option>
              <option value="NUMBER">Число</option>
              <option value="BOOLEAN">Да/Нет</option>
              <option value="SELECT">Выбор из списка</option>
              <option value="MULTI_SELECT">Множественный выбор</option>
              <option value="COLOR">Цвет</option>
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="attr-create-unit">Единица измерения</label>
            <input
              id="attr-create-unit"
              type="text"
              value={form.unit}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
              placeholder="мм, кг, шт"
            />
          </div>

          {isListAttributeType(form.type) ? (
            <div data-modal-form-group data-modal-span>
              <AttributeOptionRowsEditor
                rows={form.optionRows}
                onChange={(optionRows) => setForm((prev) => ({ ...prev, optionRows }))}
                mod={styles as AttributeOptionRowsEditorMod}
              />
            </div>
          ) : null}

          <div data-modal-form-group data-modal-span>
            <label className={createStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.isFilterable}
                disabled={saving}
                onChange={(e) => setForm((prev) => ({ ...prev, isFilterable: e.target.checked }))}
              />
              <span>Использовать для фильтрации на сайте</span>
            </label>
          </div>

          <div data-modal-form-group data-modal-span>
            <label className={createStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.linkAsRequired}
                disabled={saving}
                onChange={(e) => setForm((prev) => ({ ...prev, linkAsRequired: e.target.checked }))}
              />
              <span>Обязательный при заполнении карточек товаров в этой категории</span>
            </label>
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={saving}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={saving || !form.name.trim() || !form.slug.trim()}
          >
            {saving ? 'Создание…' : 'Создать и добавить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
