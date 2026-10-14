'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackageInstallerAdvance,
  type ContractDocumentPackageInstallerAdvancePatch,
} from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../../styles/base.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';

export type PackageInstallerAdvanceEditModalOption = {
  installerId: string;
  label: string;
};

export type PackageInstallerAdvancesEditModalProps = {
  advance: ContractDocumentPackageInstallerAdvance | null;
  /** Мастера, доступные для переноса записи (привязанные к договору + из журнала). */
  installerOptions: PackageInstallerAdvanceEditModalOption[];
  /** Пока PATCH летит на сервер — блокируем форму и кнопку «Сохранить». */
  saving: boolean;
  onClose: () => void;
  onSave: (patch: ContractDocumentPackageInstallerAdvancePatch) => void;
};

type EditDraft = {
  installerId: string;
  paidAt: string;
  amount: string;
  note: string;
};

function draftFromAdvance(advance: ContractDocumentPackageInstallerAdvance): EditDraft {
  const amountNum = Number.parseFloat(advance.amount);
  return {
    installerId: advance.installerId ?? '',
    paidAt: advance.paidAt,
    amount: Number.isFinite(amountNum) ? String(amountNum) : '',
    note: advance.note ?? '',
  };
}

export function PackageInstallerAdvancesEditModal({
  advance,
  installerOptions,
  saving,
  onClose,
  onSave,
}: PackageInstallerAdvancesEditModalProps) {
  const [draft, setDraft] = useState<EditDraft>(() =>
    advance ? draftFromAdvance(advance) : { installerId: '', paidAt: '', amount: '', note: '' }
  );

  // При открытии модалки на другой строке журнала — перечитываем черновик.
  useEffect(() => {
    if (advance) setDraft(draftFromAdvance(advance));
  }, [advance]);

  if (!advance) {
    return (
      <Modal isOpen={false} onClose={onClose} title="Изменить аванс" showCloseButton>
        <div />
      </Modal>
    );
  }

  // Запятая допустима как десятичный разделитель при вводе суммы.
  const parsedAmount = Number.parseFloat(draft.amount.trim().replace(',', '.'));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const formComplete = draft.installerId !== '' && draft.paidAt.trim() !== '' && amountValid;

  const handleSave = () => {
    if (!formComplete || saving) return;
    onSave({
      installerId: draft.installerId,
      paidAt: draft.paidAt,
      amount: Math.round(parsedAmount * 100) / 100,
      note: draft.note.trim() ? draft.note.trim() : null,
    });
  };

  const currentInstallerMissing =
    draft.installerId !== '' &&
    !installerOptions.some((opt) => opt.installerId === draft.installerId);

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Изменить аванс"
      size="md"
      showCloseButton
    >
      <div className={cdBase.paymentsEditModal}>
        <p className={cdProduct.hint}>
          Менять и удалять записи авансов может только супер-админ — для исправления ошибок. Итоги
          по мастерам пересчитаются автоматически.
        </p>
        <div className={cdBase.paymentsFormGrid}>
          <div className={cdBase.field}>
            <label htmlFor="advance_edit_installer">Мастер</label>
            <select
              id="advance_edit_installer"
              value={draft.installerId}
              disabled={saving}
              onChange={(e) => setDraft((d) => ({ ...d, installerId: e.target.value }))}
            >
              <option value="">Выберите мастера…</option>
              {currentInstallerMissing ? (
                <option value={draft.installerId}>
                  {advance.installerName ?? 'Мастер удалён из справочника'}
                </option>
              ) : null}
              {installerOptions.map((opt) => (
                <option key={opt.installerId} value={opt.installerId}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className={cdBase.field}>
            <label htmlFor="advance_edit_date">Дата выдачи</label>
            <input
              id="advance_edit_date"
              type="date"
              value={draft.paidAt}
              disabled={saving}
              onChange={(e) => setDraft((d) => ({ ...d, paidAt: e.target.value }))}
            />
          </div>
          <div className={`${cdBase.field} ${cdBase.paymentsAmountField}`}>
            <label htmlFor="advance_edit_amount">Сумма, ₽</label>
            <input
              id="advance_edit_amount"
              inputMode="decimal"
              value={draft.amount}
              disabled={saving}
              placeholder="Напр. 15000 или 15000,50"
              autoComplete="off"
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            />
            {draft.amount.trim() !== '' && !amountValid ? (
              <p className={cdBase.paymentsEditModalFieldError}>Укажите число больше нуля</p>
            ) : null}
          </div>
          <div className={`${cdBase.field} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="advance_edit_note">Комментарий</label>
            <input
              id="advance_edit_note"
              type="text"
              value={draft.note}
              disabled={saving}
              placeholder="Напр. Аванс за электрику"
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </div>
        </div>
        <div className={cdBase.paymentsFormActions}>
          <button
            data-admin-mutation
            type="button"
            className={cdWorkspace.primaryBtn}
            disabled={saving || !formComplete}
            onClick={handleSave}
          >
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            disabled={saving}
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
}
