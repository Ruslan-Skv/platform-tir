'use client';

import { useEffect, useRef, useState } from 'react';

import type { ContractDocumentPackageInstallerAdvancePaymentMethod } from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';
import {
  type CreateInstallerSettlementAdvanceParams,
  type InstallerSettlementPackageOption,
} from '@/shared/api/crm/admin-installer-settlements';
import { INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS } from '@/shared/constants/installerAdvancePaymentMethod';
import { Modal } from '@/shared/ui/Modal';
import formStyles from '@/views/admin/CRM/MoneyMovements/modals/MoneyMovementModalForm.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from '../InstallerSettlements.module.css';
import {
  IS_PACKAGE_STATUS_LABELS,
  formatIsGradeShort,
  todayIsoDate,
} from '../installer-settlements-page.constants';

const SEARCH_DEBOUNCE_MS = 400;

/** Направление справочника мастеров для договора: товарные — своё, остальные — «Ремонт» (как в модалке «Заказ-наряды»). */
function masterDirectionForKind(kind: string): string {
  return ['WINDOWS', 'DOORS', 'BLINDS', 'CEILINGS'].includes(kind) ? kind : 'REPAIR';
}

function packageLabel(pkg: InstallerSettlementPackageOption): string {
  return [
    pkg.contractNumber ? `№ ${pkg.contractNumber}` : 'без номера',
    pkg.customerName,
    pkg.direction,
    IS_PACKAGE_STATUS_LABELS[pkg.status],
  ]
    .filter(Boolean)
    .join(' · ');
}

type CreateAdvanceModalProps = {
  open: boolean;
  onClose: () => void;
  /** Справочник мастеров (загружается при открытии). */
  installers: InstallerMaster[];
  /** Поиск договоров по № / заказчику — на бэкенде (супер-админ). */
  loadPackages: (search: string) => Promise<InstallerSettlementPackageOption[]>;
  submitting: boolean;
  onSubmit: (data: CreateInstallerSettlementAdvanceParams) => Promise<void>;
};

/**
 * Выдача аванса мастеру из раздела «Расчёт мастеров» (супер-админ): выбор договора,
 * мастера направления, даты и суммы. Запись — та же, что в модалке «Заказ-наряды»
 * договора: журнал авансов и остатки там обновятся при открытии.
 */
export function CreateAdvanceModal({
  open,
  onClose,
  installers,
  loadPackages,
  submitting,
  onSubmit,
}: CreateAdvanceModalProps) {
  const [packageQuery, setPackageQuery] = useState('');
  const [packageResults, setPackageResults] = useState<InstallerSettlementPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<InstallerSettlementPackageOption | null>(
    null
  );
  const [installerId, setInstallerId] = useState('');
  const [paidAt, setPaidAt] = useState(todayIsoDate);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<ContractDocumentPackageInstallerAdvancePaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Новая выдача — чистая форма: без договора, сегодня, сумма и комментарий пустые.
  useEffect(() => {
    if (!open) return;
    setPackageQuery('');
    setPackageResults([]);
    setPackagesError(null);
    setSelectedPackage(null);
    setInstallerId('');
    setPaidAt(todayIsoDate);
    setAmount('');
    setPaymentMethod('CASH');
    setNote('');
    setError(null);
  }, [open]);

  // Подсказки договоров: сразу последние живые, дальше — с дебаунсом по поиску.
  const packageQueryRef = useRef(packageQuery);
  packageQueryRef.current = packageQuery;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        setPackagesLoading(true);
        loadPackages(packageQueryRef.current.trim())
          .then((rows) => {
            if (!cancelled) {
              setPackageResults(rows);
              setPackagesError(null);
            }
          })
          .catch((loadError) => {
            if (!cancelled) {
              setPackagesError(
                loadError instanceof Error ? loadError.message : 'Не удалось загрузить договоры'
              );
            }
          })
          .finally(() => {
            if (!cancelled) setPackagesLoading(false);
          });
      },
      packageQueryRef.current ? SEARCH_DEBOUNCE_MS : 0
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, packageQuery, loadPackages]);

  // Мастера — направления выбранного договора (как в модалке «Заказ-наряды»).
  const masterDirection = selectedPackage ? masterDirectionForKind(selectedPackage.kind) : null;
  const masterOptions = masterDirection
    ? installers.filter((installer) => installer.directions?.includes(masterDirection as never))
    : [];

  // Смена договора сбрасывает мастера, если он не подходит по направлению.
  const selectPackage = (pkg: InstallerSettlementPackageOption) => {
    setSelectedPackage(pkg);
    setInstallerId((prev) => {
      const master = installers.find((i) => i.id === prev);
      const direction = masterDirectionForKind(pkg.kind);
      return master && master.directions?.includes(direction as never) ? prev : '';
    });
  };

  const amountNumber = Number(amount.trim().replace(',', '.'));
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;
  const canSubmit = Boolean(selectedPackage) && installerId !== '' && paidAt !== '' && amountValid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPackage) {
      setError('Выберите договор, по которому выдаётся аванс');
      return;
    }
    if (installerId === '') {
      setError('Выберите мастера (направление договора)');
      return;
    }
    if (!amountValid) {
      setError('Укажите сумму выплаты (положительное число)');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        packageId: selectedPackage.id,
        installerId,
        paidAt,
        amount: Math.round(amountNumber * 100) / 100,
        paymentMethod,
        note: note.trim() ? note.trim() : undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось зафиксировать выплату'
      );
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Выплата мастеру"
      size="sm"
      className={formStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${formStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Запись попадёт в журнал выплат раздела и в модалку «Заказ-наряды» договора — остаток
          мастера пересчитается автоматически. Выдавать авансы может только супер-админ.
        </p>

        {selectedPackage ? (
          <div data-modal-form-group>
            <label>Договор</label>
            <div className={styles.advancePackageBox}>
              <span className={styles.advancePackageMain}>{packageLabel(selectedPackage)}</span>
              {selectedPackage.objectAddress ? (
                <span className={styles.advancePackageSubline}>
                  {selectedPackage.objectAddress}
                </span>
              ) : null}
              <button
                type="button"
                className={styles.advancePackageChangeBtn}
                disabled={submitting}
                onClick={() => {
                  setSelectedPackage(null);
                  setInstallerId('');
                }}
              >
                Сменить договор
              </button>
            </div>
          </div>
        ) : (
          <div data-modal-form-group>
            <label htmlFor="advance-package-search">Договор (№ или заказчик) *</label>
            <input
              id="advance-package-search"
              type="search"
              value={packageQuery}
              onChange={(e) => setPackageQuery(e.target.value)}
              disabled={submitting}
              placeholder="Например: 125-9 или Иванов"
              autoComplete="off"
            />
            {packagesLoading ? (
              <p data-modal-form-hint>Поиск договоров…</p>
            ) : packagesError ? (
              <p data-modal-form-error>{packagesError}</p>
            ) : packageResults.length === 0 ? (
              <p data-modal-form-hint>
                {packageQuery.trim()
                  ? 'Ничего не найдено — уточните номер договора или заказчика'
                  : 'Начните вводить номер договора или фамилию заказчика'}
              </p>
            ) : (
              <div className={styles.advancePackageList} role="listbox" aria-label="Договоры">
                {packageResults.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={styles.advancePackageOption}
                    disabled={submitting}
                    onClick={() => selectPackage(pkg)}
                  >
                    {packageLabel(pkg)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div data-modal-form-group>
          <label htmlFor="advance-installer">Мастер *</label>
          <select
            id="advance-installer"
            value={installerId}
            onChange={(e) => setInstallerId(e.target.value)}
            disabled={submitting || !selectedPackage}
            required
          >
            <option value="">
              {selectedPackage ? '— выбрать мастера —' : 'Сначала выберите договор'}
            </option>
            {masterOptions.map((installer) => (
              <option key={installer.id} value={installer.id}>
                {installer.fullName}
                {installer.grade ? ` (${formatIsGradeShort(installer.grade)})` : ''}
              </option>
            ))}
          </select>
          {selectedPackage && masterOptions.length === 0 ? (
            <p data-modal-form-hint>
              В справочнике нет мастеров направления «{selectedPackage.direction}».
            </p>
          ) : null}
        </div>

        <div data-modal-form-group>
          <label htmlFor="advance-paid-at">Дата выдачи *</label>
          <input
            id="advance-paid-at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="advance-amount">Сумма, ₽ *</label>
          <input
            id="advance-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            placeholder="Напр. 15000"
            autoComplete="off"
            required
          />
          {amount.trim() !== '' && !amountValid ? (
            <p data-modal-form-error>Укажите число больше нуля</p>
          ) : null}
        </div>

        <div data-modal-form-group>
          <label htmlFor="advance-payment-method">Способ оплаты</label>
          <select
            id="advance-payment-method"
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(
                e.target.value as ContractDocumentPackageInstallerAdvancePaymentMethod
              )
            }
            disabled={submitting}
          >
            {Object.entries(INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label htmlFor="advance-note">Комментарий</label>
          <input
            id="advance-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            placeholder="Напр. Аванс за электрику"
            maxLength={500}
          />
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            type="submit"
            data-admin-mutation
            data-modal-btn="primary"
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Сохранение…' : 'Выдать аванс'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
