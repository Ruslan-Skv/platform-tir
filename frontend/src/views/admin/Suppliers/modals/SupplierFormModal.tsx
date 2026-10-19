'use client';

import { useEffect, useState } from 'react';

import type { AdminSupplier, SaveSupplierParams } from '@/shared/api/admin-suppliers';
import { Modal } from '@/shared/ui/Modal';

import { parseMoneyInput } from '../suppliers-page.utils';
import styles from './SuppliersModals.module.css';

type SupplierFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** null — создание поставщика. */
  initial: AdminSupplier | null;
  submitting: boolean;
  onSubmit: (params: SaveSupplierParams) => Promise<void>;
};

/** Модалка карточки поставщика: наименования, ИНН, контакты, адрес, активность
 *  и сальдо начальное (обычно — остаток из таблицы на момент перехода в раздел). */
export function SupplierFormModal({
  open,
  onClose,
  initial,
  submitting,
  onSubmit,
}: SupplierFormModalProps) {
  const [legalName, setLegalName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [inn, setInn] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phones, setPhones] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setLegalName(initial?.legalName ?? '');
    setCommercialName(initial?.commercialName ?? '');
    setInn(initial?.inn ?? '');
    setLegalAddress(initial?.legalAddress ?? '');
    setWebsite(initial?.website ?? '');
    setEmail(initial?.email ?? '');
    setPhones(initial?.phone?.length ? [...initial.phone] : ['']);
    setIsActive(initial?.isActive ?? true);
    setOpeningBalance(initial?.openingBalance != null ? String(initial.openingBalance) : '');
    setOpeningBalanceDate(initial?.openingBalanceDate ?? '');
  }, [open, initial]);

  const setPhone = (index: number, value: string) => {
    setPhones((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const handleSubmit = () => {
    const trimmedLegalName = legalName.trim();
    if (trimmedLegalName.length < 2) {
      setFormError('Укажите наименование юридическое (минимум 2 символа)');
      return;
    }
    const trimmedInn = inn.trim();
    if (trimmedInn && !/^\d+$/.test(trimmedInn)) {
      setFormError('ИНН — только цифры');
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Email указан неверно');
      return;
    }
    const balanceInput = openingBalance.trim();
    const parsedBalance = balanceInput ? parseMoneyInput(balanceInput) : null;
    if (balanceInput && parsedBalance == null) {
      setFormError('Сальдо начальное — число (например, 83061,40 или -745,83)');
      return;
    }

    setFormError(null);
    const phoneList = phones.map((p) => p.trim()).filter(Boolean);
    void onSubmit({
      legalName: trimmedLegalName,
      ...(commercialName.trim() ? { commercialName: commercialName.trim() } : {}),
      ...(trimmedInn ? { inn: trimmedInn } : {}),
      ...(legalAddress.trim() ? { legalAddress: legalAddress.trim() } : {}),
      ...(website.trim() ? { website: website.trim() } : {}),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      phone: phoneList,
      isActive,
      openingBalance: parsedBalance,
      openingBalanceDate: parsedBalance != null && openingBalanceDate ? openingBalanceDate : null,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initial ? 'Реквизиты и карточка поставщика' : 'Новый поставщик'}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Основная карточка поставщика. Банковские реквизиты (банк, р/с, БИК) — отдельными блоками
          на вкладке «Реквизиты» карточки поставщика: у одного поставщика их может быть несколько.
        </p>

        <div data-modal-form-group>
          <label htmlFor="supplier_legal_name">Наименование юридическое *</label>
          <input
            id="supplier_legal_name"
            type="text"
            placeholder="ООО «Ромашка» / ИП Иванов Иван Иванович"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            disabled={submitting}
            required
            maxLength={300}
          />
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="supplier_commercial_name">Наименование коммерческое</label>
            <input
              id="supplier_commercial_name"
              type="text"
              placeholder="Как в таблице: «ФИС (жалюзи форум)»"
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              disabled={submitting}
              maxLength={300}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="supplier_inn">ИНН</label>
            <input
              id="supplier_inn"
              type="text"
              inputMode="numeric"
              placeholder="519031085770"
              value={inn}
              onChange={(e) => setInn(e.target.value)}
              disabled={submitting}
              maxLength={64}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="supplier_legal_address">Юридический адрес</label>
          <textarea
            id="supplier_legal_address"
            placeholder="153000, г. Мурманск, …"
            value={legalAddress}
            onChange={(e) => setLegalAddress(e.target.value)}
            disabled={submitting}
            maxLength={500}
            rows={2}
          />
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="supplier_email">Email</label>
            <input
              id="supplier_email"
              type="email"
              placeholder="office@company.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              maxLength={200}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="supplier_website">Сайт</label>
            <input
              id="supplier_website"
              type="text"
              placeholder="https://…"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={submitting}
              maxLength={300}
            />
          </div>
        </div>

        {phones.map((phone, index) => (
          <div data-modal-form-group key={`supplier_phone_${index}`}>
            <label htmlFor={`supplier_phone_${index}`}>
              Телефон{phones.length > 1 ? ` ${index + 1}` : ''}
            </label>
            <div className={styles.fieldRow}>
              <input
                id={`supplier_phone_${index}`}
                type="text"
                placeholder="+7 (921) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(index, e.target.value)}
                disabled={submitting}
                maxLength={64}
                style={{ flex: 1 }}
              />
              {phones.length > 1 ? (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setPhones((prev) => prev.filter((_, i) => i !== index))}
                  disabled={submitting}
                  aria-label="Удалить телефон"
                >
                  Убрать
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <button
          type="button"
          className={`${styles.linkButton} ${styles.addButtonRow}`}
          onClick={() => setPhones((prev) => [...prev, ''])}
          disabled={submitting}
        >
          + Телефон
        </button>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="supplier_opening_balance">
              Сальдо начальное, ₽ (+ должны / − переплата)
            </label>
            <input
              id="supplier_opening_balance"
              type="text"
              inputMode="decimal"
              placeholder="83061,40"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="supplier_opening_date">Дата сальдо</label>
            <input
              id="supplier_opening_date"
              type="date"
              value={openingBalanceDate}
              onChange={(e) => setOpeningBalanceDate(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <p data-modal-form-hint>
          Сальдо начальное — точка отсчёта ведомости (обычно текущий остаток из таблицы). Итоговое
          «К оплате» = сальдо начальное + Σ счетов − Σ оплат.
        </p>

        <div data-modal-form-group>
          <label
            htmlFor="supplier_is_active"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}
          >
            <input
              id="supplier_is_active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={submitting}
            />
            Активный поставщик
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
            disabled={submitting || legalName.trim().length < 2}
          >
            {submitting ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать поставщика'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
