'use client';

import { useEffect, useState } from 'react';

import type { SalaryCategory } from '@/shared/api/admin-salary';
import { Modal } from '@/shared/ui/Modal';

import styles from './SalaryPage.module.css';
import type { SalaryCategoryInput } from './hooks/useSalarySettings';
import { parseDecimal } from './salary-page.constants';

type SalaryCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Редактируемая категория; null — создание новой. */
  category: SalaryCategory | null;
  saving: boolean;
  onSubmit: (input: SalaryCategoryInput) => void;
};

interface CategoryFormState {
  code: string;
  name: string;
  vsPercent: string;
  splitSign: string;
  splitClose: string;
  managerPercent: string;
  surveyorPercent: string;
  brigadierPercent: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: CategoryFormState = {
  code: '',
  name: '',
  vsPercent: '10',
  splitSign: '0.5',
  splitClose: '0.5',
  managerPercent: '3',
  surveyorPercent: '3',
  brigadierPercent: '3',
  sortOrder: '100',
  isActive: true,
};

/** Модалка создания/правки категории договоров со ставками по должностям. */
export function SalaryCategoryModal({
  isOpen,
  onClose,
  category,
  saving,
  onSubmit,
}: SalaryCategoryModalProps) {
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (category) {
      setForm({
        code: category.code,
        name: category.name,
        vsPercent: String(category.vsPercent),
        splitSign: String(category.splitSign),
        splitClose: String(category.splitClose),
        managerPercent: String(category.managerPercent),
        surveyorPercent: String(category.surveyorPercent),
        brigadierPercent: String(category.brigadierPercent),
        sortOrder: String(category.sortOrder),
        isActive: category.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, category]);

  const patch = (update: Partial<CategoryFormState>) => setForm((f) => ({ ...f, ...update }));

  const handleSubmit = () => {
    if (!category && !form.code.trim()) {
      setFormError('Укажите код категории (например, WINDOWS)');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Укажите название категории');
      return;
    }
    const numeric = {
      vsPercent: parseDecimal(form.vsPercent),
      splitSign: parseDecimal(form.splitSign),
      splitClose: parseDecimal(form.splitClose),
      managerPercent: parseDecimal(form.managerPercent),
      surveyorPercent: parseDecimal(form.surveyorPercent),
      brigadierPercent: parseDecimal(form.brigadierPercent),
      sortOrder: parseDecimal(form.sortOrder),
    };
    if (Object.values(numeric).some((v) => v === null)) {
      setFormError('Все ставки должны быть числами');
      return;
    }
    onSubmit({
      code: category ? undefined : form.code.trim().toUpperCase(),
      name: form.name.trim(),
      ...numeric,
      isActive: form.isActive,
    } as SalaryCategoryInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? `Категория «${category.name}»` : 'Новая категория'}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint>
          Ставки категории применяются ко всем договорам этой категории. Приоритет переопределений:
          договор → офис → категория. Сплит — доля ставки при заключении и при закрытии договора
          (сумма долей обычно равна 1).
        </p>

        <div data-modal-form-grid>
          {!category ? (
            <div data-modal-form-group>
              <label htmlFor="salary_category_code">Код *</label>
              <input
                id="salary_category_code"
                type="text"
                placeholder="WINDOWS"
                value={form.code}
                onChange={(e) => patch({ code: e.target.value })}
                disabled={saving}
                maxLength={50}
              />
            </div>
          ) : null}

          <div data-modal-form-group>
            <label htmlFor="salary_category_name">Название *</label>
            <input
              id="salary_category_name"
              type="text"
              placeholder="Окна"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              disabled={saving}
              maxLength={100}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_vs">% ВС</label>
            <input
              id="salary_category_vs"
              type="text"
              inputMode="decimal"
              value={form.vsPercent}
              onChange={(e) => patch({ vsPercent: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_split_sign">Сплит при заключении</label>
            <input
              id="salary_category_split_sign"
              type="text"
              inputMode="decimal"
              value={form.splitSign}
              onChange={(e) => patch({ splitSign: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_split_close">Сплит при закрытии</label>
            <input
              id="salary_category_split_close"
              type="text"
              inputMode="decimal"
              value={form.splitClose}
              onChange={(e) => patch({ splitClose: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_manager">% менеджера</label>
            <input
              id="salary_category_manager"
              type="text"
              inputMode="decimal"
              value={form.managerPercent}
              onChange={(e) => patch({ managerPercent: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_surveyor">% замерщика</label>
            <input
              id="salary_category_surveyor"
              type="text"
              inputMode="decimal"
              value={form.surveyorPercent}
              onChange={(e) => patch({ surveyorPercent: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_brigadier">% бригады</label>
            <input
              id="salary_category_brigadier"
              type="text"
              inputMode="decimal"
              value={form.brigadierPercent}
              onChange={(e) => patch({ brigadierPercent: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_category_sort">Порядок сортировки</label>
            <input
              id="salary_category_sort"
              type="text"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => patch({ sortOrder: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>

        <label className={styles.formCheckbox}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => patch({ isActive: e.target.checked })}
            disabled={saving}
          />
          Категория активна (доступна в договорах и фильтрах)
        </label>

        {formError ? <p data-modal-form-error>{formError}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : category ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
