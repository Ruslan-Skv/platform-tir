'use client';

import { useEffect, useState } from 'react';

import type { CrmUser, Office } from '@/shared/api/admin-crm';
import type { SalaryCategory, SalaryContract } from '@/shared/api/admin-salary';
import { Modal } from '@/shared/ui/Modal';

import styles from './SalaryPage.module.css';
import type { SalaryContractInput } from './hooks/useSalaryContracts';
import {
  CONTRACT_MANAGER_ROLES,
  CONTRACT_SURVEYOR_ROLES,
  formatPercent,
  parseDecimal,
} from './salary-page.constants';

type ContractFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Редактируемый договор; null — создание нового. */
  contract: SalaryContract | null;
  offices: Office[];
  categories: SalaryCategory[];
  users: CrmUser[];
  saving: boolean;
  onSubmit: (input: SalaryContractInput) => void;
};

interface ExtraBillDraft {
  amount: string;
  date: string;
  note: string;
}

interface FormState {
  officeId: string;
  categoryId: string;
  number: string;
  signedAt: string;
  closedAt: string;
  customerName: string;
  managerId: string;
  managerName: string;
  surveyorId: string;
  surveyorName: string;
  managerHandled: boolean;
  surveyorHandled: boolean;
  baseAmount: string;
  managerPercentOverride: string;
  surveyorPercentOverride: string;
  vsPercentOverride: string;
  brigadierPercentOverride: string;
  source: string;
  note: string;
  extraBills: ExtraBillDraft[];
}

const EMPTY_FORM: FormState = {
  officeId: '',
  categoryId: '',
  number: '',
  signedAt: '',
  closedAt: '',
  customerName: '',
  managerId: '',
  managerName: '',
  surveyorId: '',
  surveyorName: '',
  managerHandled: true,
  surveyorHandled: true,
  baseAmount: '',
  managerPercentOverride: '',
  surveyorPercentOverride: '',
  vsPercentOverride: '',
  brigadierPercentOverride: '',
  source: '',
  note: '',
  extraBills: [],
};

function userName(user: CrmUser): string {
  return [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email;
}

/** Модалка добавления/правки договора для расчёта з/п. */
export function ContractFormModal({
  isOpen,
  onClose,
  contract,
  offices,
  categories,
  users,
  saving,
  onSubmit,
}: ContractFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (contract) {
      setForm({
        officeId: contract.officeId,
        categoryId: contract.categoryId,
        number: contract.number,
        signedAt: contract.signedAt,
        closedAt: contract.closedAt ?? '',
        customerName: contract.customerName ?? '',
        managerId: contract.managerId ?? '',
        managerName: contract.managerName ?? '',
        surveyorId: contract.surveyorId ?? '',
        surveyorName: contract.surveyorName ?? '',
        managerHandled: contract.managerHandled,
        surveyorHandled: contract.surveyorHandled,
        baseAmount: String(contract.baseAmount),
        managerPercentOverride:
          contract.managerPercentOverride === null ? '' : String(contract.managerPercentOverride),
        surveyorPercentOverride:
          contract.surveyorPercentOverride === null ? '' : String(contract.surveyorPercentOverride),
        vsPercentOverride:
          contract.vsPercentOverride === null ? '' : String(contract.vsPercentOverride),
        brigadierPercentOverride:
          contract.brigadierPercentOverride === null
            ? ''
            : String(contract.brigadierPercentOverride),
        source: contract.source ?? '',
        note: contract.note ?? '',
        extraBills: contract.extraBills.map((b) => ({
          amount: String(b.amount),
          date: b.date,
          note: b.note ?? '',
        })),
      });
    } else {
      setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' });
    }
  }, [isOpen, contract, categories]);

  const managers = users.filter((u) =>
    (CONTRACT_MANAGER_ROLES as readonly string[]).includes(u.role)
  );
  const surveyors = users.filter((u) =>
    (CONTRACT_SURVEYOR_ROLES as readonly string[]).includes(u.role)
  );
  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const patch = (update: Partial<FormState>) => setForm((f) => ({ ...f, ...update }));

  const setExtraBill = (index: number, update: Partial<ExtraBillDraft>) => {
    setForm((f) => ({
      ...f,
      extraBills: f.extraBills.map((b, i) => (i === index ? { ...b, ...update } : b)),
    }));
  };

  const handleSubmit = () => {
    const baseAmount = parseDecimal(form.baseAmount);
    if (!form.officeId || !form.categoryId || !form.number.trim()) {
      setFormError('Заполните офис, направление и № договора');
      return;
    }
    if (baseAmount === null) {
      setFormError('Укажите стоимость договора (изделия + монтаж либо стоимость)');
      return;
    }
    onSubmit({
      officeId: form.officeId,
      categoryId: form.categoryId,
      number: form.number.trim(),
      signedAt: form.signedAt || null,
      closedAt: form.closedAt || null,
      customerName: form.customerName.trim() || null,
      managerId: form.managerId || null,
      managerName: form.managerName.trim() || null,
      surveyorId: form.surveyorId || null,
      surveyorName: form.surveyorName.trim() || null,
      managerHandled: form.managerHandled,
      surveyorHandled: form.surveyorHandled,
      baseAmount,
      managerPercentOverride: parseDecimal(form.managerPercentOverride),
      surveyorPercentOverride: parseDecimal(form.surveyorPercentOverride),
      vsPercentOverride: parseDecimal(form.vsPercentOverride),
      brigadierPercentOverride: parseDecimal(form.brigadierPercentOverride),
      source: form.source.trim() || null,
      note: form.note.trim() || null,
      extraBills: form.extraBills
        .filter((b) => b.amount !== '' && b.date)
        .map((b) => ({
          amount: parseDecimal(b.amount) ?? 0,
          date: b.date,
          note: b.note.trim() || null,
        })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? `Договор №${contract.number}` : 'Новый договор'}
      size="lg"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint>
          Договор попадает в расчёт з/п за период, если дата заключения, закрытия или доп.
          соглашения входят в него. «Общий» договор (без менеджера) и договор без замера удваивают
          соответствующую часть в общий пул.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="salary_contract_office">Офис *</label>
            <select
              id="salary_contract_office"
              value={form.officeId}
              onChange={(e) => patch({ officeId: e.target.value })}
              disabled={saving}
            >
              <option value="">— выберите —</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_category">Направление *</label>
            <select
              id="salary_contract_category"
              value={form.categoryId}
              onChange={(e) => patch({ categoryId: e.target.value })}
              disabled={saving}
            >
              <option value="">— выберите —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (ВС {c.vsPercent}%, мен {c.managerPercent}%)
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_number">№ договора *</label>
            <input
              id="salary_contract_number"
              type="text"
              value={form.number}
              onChange={(e) => patch({ number: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_base">Стоимость договора, ₽ *</label>
            <input
              id="salary_contract_base"
              type="text"
              inputMode="decimal"
              placeholder="изделия + монтаж либо стоимость"
              value={form.baseAmount}
              onChange={(e) => patch({ baseAmount: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_signed">Дата заключения</label>
            <input
              id="salary_contract_signed"
              type="date"
              value={form.signedAt}
              onChange={(e) => patch({ signedAt: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_closed">Дата закрытия</label>
            <input
              id="salary_contract_closed"
              type="date"
              value={form.closedAt}
              onChange={(e) => patch({ closedAt: e.target.value })}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_customer">Заказчик</label>
            <input
              id="salary_contract_customer"
              type="text"
              value={form.customerName}
              onChange={(e) => patch({ customerName: e.target.value })}
              disabled={saving}
              maxLength={200}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_source">Источник</label>
            <input
              id="salary_contract_source"
              type="text"
              placeholder="яндекс, наружка, по рекомендации…"
              value={form.source}
              onChange={(e) => patch({ source: e.target.value })}
              disabled={saving}
              maxLength={200}
            />
          </div>
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="salary_contract_manager">Менеджер</label>
            <select
              id="salary_contract_manager"
              value={form.managerId}
              onChange={(e) => patch({ managerId: e.target.value })}
              disabled={saving}
            >
              <option value="">— не выбран —</option>
              {managers.map((u) => (
                <option key={u.id} value={u.id}>
                  {userName(u)}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_manager_name">Имя менеджера (если нет в списке)</label>
            <input
              id="salary_contract_manager_name"
              type="text"
              value={form.managerName}
              onChange={(e) => patch({ managerName: e.target.value })}
              disabled={saving}
              maxLength={200}
            />
          </div>

          <label className={styles.formCheckbox}>
            <input
              type="checkbox"
              checked={form.managerHandled}
              onChange={(e) => patch({ managerHandled: e.target.checked })}
              disabled={saving}
            />
            Менеджер вёл договор (снять — «общий», з/п ×2 в пул)
          </label>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_surveyor">Замерщик</label>
            <select
              id="salary_contract_surveyor"
              value={form.surveyorId}
              onChange={(e) => patch({ surveyorId: e.target.value })}
              disabled={saving}
            >
              <option value="">— не выбран —</option>
              {surveyors.map((u) => (
                <option key={u.id} value={u.id}>
                  {userName(u)}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="salary_contract_surveyor_name">Имя замерщика (если нет в списке)</label>
            <input
              id="salary_contract_surveyor_name"
              type="text"
              value={form.surveyorName}
              onChange={(e) => patch({ surveyorName: e.target.value })}
              disabled={saving}
              maxLength={200}
            />
          </div>

          <label className={styles.formCheckbox}>
            <input
              type="checkbox"
              checked={form.surveyorHandled}
              onChange={(e) => patch({ surveyorHandled: e.target.checked })}
              disabled={saving}
            />
            Замер был (снять — часть замерщика ×2 в пул)
          </label>
        </div>

        {selectedCategory ? (
          <p data-modal-form-hint>
            Ставки направления «{selectedCategory.name}»: менеджер{' '}
            {formatPercent(selectedCategory.managerPercent)}, замерщик{' '}
            {formatPercent(selectedCategory.surveyorPercent)}, ВС{' '}
            {formatPercent(selectedCategory.vsPercent)}, бригадир{' '}
            {formatPercent(selectedCategory.brigadierPercent)}; сплит {selectedCategory.splitSign}/
            {selectedCategory.splitClose}. Ниже можно переопределить ставки для этого договора.
          </p>
        ) : null}

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="salary_override_manager">% менеджера</label>
            <input
              id="salary_override_manager"
              type="text"
              inputMode="decimal"
              placeholder="по настройкам"
              value={form.managerPercentOverride}
              onChange={(e) => patch({ managerPercentOverride: e.target.value })}
              disabled={saving}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="salary_override_surveyor">% замерщика</label>
            <input
              id="salary_override_surveyor"
              type="text"
              inputMode="decimal"
              placeholder="по настройкам"
              value={form.surveyorPercentOverride}
              onChange={(e) => patch({ surveyorPercentOverride: e.target.value })}
              disabled={saving}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="salary_override_vs">% ВС</label>
            <input
              id="salary_override_vs"
              type="text"
              inputMode="decimal"
              placeholder="по настройкам"
              value={form.vsPercentOverride}
              onChange={(e) => patch({ vsPercentOverride: e.target.value })}
              disabled={saving}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="salary_override_brigadier">% бригадира</label>
            <input
              id="salary_override_brigadier"
              type="text"
              inputMode="decimal"
              placeholder="по настройкам"
              value={form.brigadierPercentOverride}
              onChange={(e) => patch({ brigadierPercentOverride: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label>Доп. согл. (попадают в расчёт по своей дате)</label>
          <div className={styles.extraBillsList}>
            {form.extraBills.length === 0 ? (
              <span className={styles.mutedCell}>Доп. согл. нет</span>
            ) : null}
            {form.extraBills.map((bill, index) => (
              <div className={styles.extraBillRow} key={index}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Сумма (может быть −)"
                  className={styles.extraBillAmount}
                  value={bill.amount}
                  onChange={(e) => setExtraBill(index, { amount: e.target.value })}
                  disabled={saving}
                  aria-label="Сумма доп. согл."
                />
                <input
                  type="date"
                  className={styles.extraBillDate}
                  value={bill.date}
                  onChange={(e) => setExtraBill(index, { date: e.target.value })}
                  disabled={saving}
                  aria-label="Дата доп. согл."
                />
                <input
                  type="text"
                  placeholder="Примечание"
                  className={styles.extraBillNote}
                  value={bill.note}
                  onChange={(e) => setExtraBill(index, { note: e.target.value })}
                  disabled={saving}
                  aria-label="Примечание доп. согл."
                />
                <button
                  type="button"
                  className={styles.extraBillRemove}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      extraBills: f.extraBills.filter((_, i) => i !== index),
                    }))
                  }
                  disabled={saving}
                  title="Убрать строку доп. согл."
                  aria-label="Убрать строку доп. согл."
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.extraBillAdd}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  extraBills: [...f.extraBills, { amount: '', date: '', note: '' }],
                }))
              }
              disabled={saving}
            >
              + строка
            </button>
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="salary_contract_note">Примечание</label>
          <textarea
            id="salary_contract_note"
            rows={2}
            value={form.note}
            onChange={(e) => patch({ note: e.target.value })}
            disabled={saving}
            maxLength={1000}
          />
        </div>

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
            {saving ? 'Сохранение…' : contract ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
