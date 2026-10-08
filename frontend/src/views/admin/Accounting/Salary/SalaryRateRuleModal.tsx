'use client';

import { useEffect, useState } from 'react';

import type { Office } from '@/shared/api/admin-crm';
import type { SalaryCategory } from '@/shared/api/admin-salary';
import { Modal } from '@/shared/ui/Modal';

import type { SalaryRateRuleInput } from './hooks/useSalarySettings';
import { SALARY_ROLE_OPTIONS, formatPercent, parseDecimal } from './salary-page.constants';

type SalaryRateRuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Направление, для которого добавляется правило. */
  category: SalaryCategory | null;
  offices: Office[];
  saving: boolean;
  onSubmit: (input: SalaryRateRuleInput) => void;
};

/** Модалка добавления переопределения ставки по офису для направления. */
export function SalaryRateRuleModal({
  isOpen,
  onClose,
  category,
  offices,
  saving,
  onSubmit,
}: SalaryRateRuleModalProps) {
  const [officeId, setOfficeId] = useState('');
  const [role, setRole] = useState('MANAGER');
  const [percent, setPercent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setOfficeId('');
    setRole('MANAGER');
    setPercent('');
  }, [isOpen, category?.id]);

  const handleSubmit = () => {
    const percentNum = parseDecimal(percent);
    if (percentNum === null) {
      setFormError('Укажите процент ставки');
      return;
    }
    onSubmit({ officeId: officeId || null, role, percent: percentNum });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? `Правило ставок — ${category.name}` : 'Правило ставок'}
      size="sm"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint>
          Правило переопределяет ставку направления для выбранной должности и офиса (или всех
          офисов). Приоритет: договор → офис → направление. Повторное правило с теми же офисом и
          должностью обновляет процент.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="salary_rule_office">Офис</label>
            <select
              id="salary_rule_office"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
              disabled={saving}
            >
              <option value="">Все офисы</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_rule_role">Должность *</label>
            <select
              id="salary_rule_role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={saving}
            >
              {SALARY_ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_rule_percent">Процент, % *</label>
            <input
              id="salary_rule_percent"
              type="text"
              inputMode="decimal"
              placeholder="напр. 3,5"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {category && category.rateRules.length > 0 ? (
          <p data-modal-form-hint>
            Действующие правила:{' '}
            {category.rateRules
              .map(
                (r) =>
                  `${r.officeName ?? 'все офисы'} · ${
                    SALARY_ROLE_OPTIONS.find((o) => o.value === r.role)?.label ?? r.role
                  } — ${formatPercent(r.percent)}`
              )
              .join('; ')}
          </p>
        ) : null}

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
            {saving ? 'Сохранение…' : 'Сохранить правило'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
