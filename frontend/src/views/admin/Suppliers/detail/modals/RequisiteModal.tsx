'use client';

import { useEffect, useState } from 'react';

import type {
  AdminSupplierRequisite,
  SaveSupplierRequisiteParams,
} from '@/shared/api/admin-suppliers';
import { Modal } from '@/shared/ui/Modal';

type RequisiteModalProps = {
  open: boolean;
  onClose: () => void;
  /** null — новый блок реквизитов. */
  initial: AdminSupplierRequisite | null;
  submitting: boolean;
  onSubmit: (params: SaveSupplierRequisiteParams) => Promise<void>;
};

/** Блок банковских реквизитов поставщика — как шапка вкладки в таблице
 *  (наименование юрлица, банк, р/с, БИК, корсчёт, ИНН/КПП). */
export function RequisiteModal({
  open,
  onClose,
  initial,
  submitting,
  onSubmit,
}: RequisiteModalProps) {
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankBik, setBankBik] = useState('');
  const [corrAccount, setCorrAccount] = useState('');
  const [inn, setInn] = useState('');
  const [kpp, setKpp] = useState('');
  const [note, setNote] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setName(initial?.name ?? '');
    setBankName(initial?.bankName ?? '');
    setBankAccount(initial?.bankAccount ?? '');
    setBankBik(initial?.bankBik ?? '');
    setCorrAccount(initial?.corrAccount ?? '');
    setInn(initial?.inn ?? '');
    setKpp(initial?.kpp ?? '');
    setNote(initial?.note ?? '');
    setIsDefault(initial?.isDefault ?? false);
  }, [open, initial]);

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      setFormError('Укажите наименование блока реквизитов (например, «ИП Ермаков»)');
      return;
    }
    setFormError(null);
    void onSubmit({
      name: name.trim(),
      bankName: bankName.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankBik: bankBik.trim() || undefined,
      corrAccount: corrAccount.trim() || undefined,
      inn: inn.trim() || undefined,
      kpp: kpp.trim() || undefined,
      note: note.trim() || undefined,
      isDefault,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initial ? 'Изменить блок реквизитов' : 'Новый блок реквизитов'}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Банковские реквизиты для платежей. У одного поставщика может быть несколько блоков —
          разные юрлица и счета («ИП Ермаков», «Реквизиты до 2021» и т.п.).
        </p>

        <div data-modal-form-group>
          <label htmlFor="requisite_name">Наименование блока *</label>
          <input
            id="requisite_name"
            type="text"
            placeholder="ИП Ермаков / ООО Ника / Основные реквизиты"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            required
            maxLength={200}
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="requisite_bank">Банк</label>
          <input
            id="requisite_bank"
            type="text"
            placeholder="ОТДЕЛЕНИЕ N8627 СБЕРБАНКА РОССИИ Г. МУРМАНСК"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            disabled={submitting}
            maxLength={300}
          />
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="requisite_account">Расчётный счёт</label>
            <input
              id="requisite_account"
              type="text"
              inputMode="numeric"
              placeholder="40802810741000008795"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              disabled={submitting}
              maxLength={64}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="requisite_bik">БИК</label>
            <input
              id="requisite_bik"
              type="text"
              inputMode="numeric"
              placeholder="44705615"
              value={bankBik}
              onChange={(e) => setBankBik(e.target.value)}
              disabled={submitting}
              maxLength={32}
            />
          </div>
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="requisite_corr">Корр. счёт</label>
            <input
              id="requisite_corr"
              type="text"
              inputMode="numeric"
              placeholder="30101810500000000681"
              value={corrAccount}
              onChange={(e) => setCorrAccount(e.target.value)}
              disabled={submitting}
              maxLength={64}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="requisite_inn">ИНН блока</label>
            <input
              id="requisite_inn"
              type="text"
              inputMode="numeric"
              placeholder="Если отличается от ИНН карточки"
              value={inn}
              onChange={(e) => setInn(e.target.value)}
              disabled={submitting}
              maxLength={64}
            />
          </div>
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="requisite_kpp">КПП</label>
            <input
              id="requisite_kpp"
              type="text"
              inputMode="numeric"
              placeholder="519001001"
              value={kpp}
              onChange={(e) => setKpp(e.target.value)}
              disabled={submitting}
              maxLength={32}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="requisite_note">Примечание</label>
            <input
              id="requisite_note"
              type="text"
              placeholder="Новые реквизиты с 2021 года"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              maxLength={1000}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label
            htmlFor="requisite_is_default"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}
          >
            <input
              id="requisite_is_default"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              disabled={submitting}
            />
            Реквизиты по умолчанию
          </label>
        </div>

        {formError ? <p data-modal-form-error>{formError}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            onClick={handleSubmit}
            disabled={submitting || name.trim().length < 2}
          >
            {submitting ? 'Сохранение…' : initial ? 'Сохранить' : 'Добавить реквизиты'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
