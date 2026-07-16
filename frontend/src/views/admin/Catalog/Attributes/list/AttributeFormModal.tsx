'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import {
  AttributeOptionRowsEditor,
  type AttributeOptionRowsEditorMod,
} from '@/views/admin/Catalog/Categories/attributes/AttributeOptionRowsEditor';
import categoryAttrStyles from '@/views/admin/Catalog/Categories/attributes/CategoryAttributesPage.module.css';
import createStyles from '@/views/admin/Catalog/Categories/list/CategoryCreateModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import type { AdminAttribute, AttributeFormState } from './attributes-page.types';
import { generateSlug, isListAttributeType } from './attributes-page.utils';

type AttributeFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  initial?: AdminAttribute | null;
  onClose: () => void;
  onSubmit: (form: AttributeFormState) => Promise<void>;
};

const EMPTY_FORM: AttributeFormState = {
  name: '',
  slug: '',
  type: 'TEXT',
  unit: '',
  isFilterable: true,
  optionRows: [],
};

function formFromAttribute(attr: AdminAttribute): AttributeFormState {
  const sorted = [...attr.values].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return {
    name: attr.name,
    slug: attr.slug,
    type: attr.type,
    unit: attr.unit || '',
    isFilterable: attr.isFilterable,
    optionRows: sorted.map((v) => v.value),
  };
}

export function AttributeFormModal({
  open,
  mode,
  saving,
  initial,
  onClose,
  onSubmit,
}: AttributeFormModalProps) {
  const [form, setForm] = useState<AttributeFormState>(EMPTY_FORM);
  const [autoSlug, setAutoSlug] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setForm(formFromAttribute(initial));
      setAutoSlug(false);
    } else {
      setForm(EMPTY_FORM);
      setAutoSlug(true);
    }
    setError(null);
  }, [open, mode, initial]);

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
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const title = mode === 'create' ? 'Новая характеристика' : 'Редактировать характеристику';
  const submitLabel = mode === 'create' ? 'Создать' : 'Сохранить';
  const submittingLabel = mode === 'create' ? 'Создание…' : 'Сохранение…';

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
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
          {mode === 'create'
            ? 'Создаётся определение характеристики в каталоге. Чтобы она появилась у товаров, привяжите её к нужным категориям на странице атрибутов категории.'
            : 'Изменения имени, типа и вариантов применяются глобально во всех категориях, где эта характеристика уже привязана.'}
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="attr-form-name">Название *</label>
            <input
              id="attr-form-name"
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
            <label htmlFor="attr-form-slug">Slug (URL) *</label>
            <input
              id="attr-form-slug"
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
            <label htmlFor="attr-form-type">Тип</label>
            <select
              id="attr-form-type"
              value={form.type}
              disabled={saving}
              onChange={(e) => {
                const type = e.target.value as AttributeFormState['type'];
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
            <label htmlFor="attr-form-unit">Единица измерения</label>
            <input
              id="attr-form-unit"
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
                mod={categoryAttrStyles as AttributeOptionRowsEditorMod}
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
            {saving ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
