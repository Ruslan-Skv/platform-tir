'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackage,
  type ContractDocumentPackageInstallerAdvancePaymentMethod,
  getContractDocumentPackageInstallerAdvances,
} from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';
import { type CreateInstallerSettlementAdvanceParams } from '@/shared/api/crm/admin-installer-settlements';
import { INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS } from '@/shared/constants/installerAdvancePaymentMethod';
import { Modal } from '@/shared/ui/Modal';
import formStyles from '@/views/admin/CRM/MoneyMovements/modals/MoneyMovementModalForm.module.css';
import {
  PackageOrderSearch,
  packageAssignedInstallerIds,
  packageFormFields,
  packageSearchLabel,
} from '@/views/admin/CRM/shared/PackageOrderSearch';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import { formatIsGradeShort, todayIsoDate } from '../installer-settlements-page.constants';

/** Пункт селекта мастеров: привязан к заказу или уже получал аванс по нему. */
type PackageMasterOption = {
  installerId: string;
  label: string;
};

function masterOptionLabel(name: string, grade: string | null | undefined): string {
  return grade ? `${name} (${formatIsGradeShort(grade)})` : name;
}

type CreateAdvanceModalProps = {
  open: boolean;
  onClose: () => void;
  /** Справочник мастеров (загружается при открытии). */
  installers: InstallerMaster[];
  submitting: boolean;
  onSubmit: (data: CreateInstallerSettlementAdvanceParams) => Promise<void>;
};

/**
 * Выдача аванса мастеру из раздела «Расчёт мастеров» (супер-админ): договор
 * выбирается панелью «Поиск заказа», его номер подставляется в поле под панелью,
 * мастера — только этого заказа (привязанные к договору + получавшие по нему
 * авансы), как в селекте модалки «Заказ-наряды» договора. Запись — та же, что
 * там: журнал авансов и остатки обновятся при открытии.
 */
export function CreateAdvanceModal({
  open,
  onClose,
  installers,
  submitting,
  onSubmit,
}: CreateAdvanceModalProps) {
  const [contractSearch, setContractSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<ContractDocumentPackage | null>(null);
  /** Мастера выбранного заказа (привязанные + из журнала авансов). */
  const [packageMasters, setPackageMasters] = useState<PackageMasterOption[]>([]);
  const [installerId, setInstallerId] = useState('');
  const [paidAt, setPaidAt] = useState(todayIsoDate);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<ContractDocumentPackageInstallerAdvancePaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Новая выдача — чистая форма: без заказа, сегодня, сумма и комментарий пустые.
  useEffect(() => {
    if (!open) return;
    setContractSearch('');
    setSelectedPackage(null);
    setPackageMasters([]);
    setInstallerId('');
    setPaidAt(todayIsoDate);
    setAmount('');
    setPaymentMethod('CASH');
    setNote('');
    setError(null);
  }, [open]);

  // Номер договора выбранного заказа — заполняется поиском, вручную не меняется.
  const contractNumber = selectedPackage ? packageFormFields(selectedPackage).contractNumber : '';

  // Выбор заказа: подпись уходит в поле поиска, номер — в поле «Номер договора»,
  // список мастеров — привязанные к этому заказу, затем из журнала авансов по нему.
  const handlePackageSelect = (pkg: ContractDocumentPackage) => {
    setSelectedPackage(pkg);
    setContractSearch(packageSearchLabel(pkg));

    const registryById = new Map(installers.map((master) => [master.id, master]));
    const options: PackageMasterOption[] = packageAssignedInstallerIds(pkg)
      .map((id) => registryById.get(id))
      .filter((master): master is InstallerMaster => master != null)
      .map((master) => ({
        installerId: master.id,
        label: masterOptionLabel(master.fullName, master.grade),
      }));
    setPackageMasters(options);
    const optionIds = new Set(options.map((option) => option.installerId));
    setInstallerId((prev) => (prev === '' || optionIds.has(prev) ? prev : ''));

    // Мастера, уже получавшие аванс по этому заказу, — даже если отвязаны от договора.
    void getContractDocumentPackageInstallerAdvances(pkg.id)
      .then((rows) => {
        setPackageMasters((current) => {
          const seen = new Set(current.map((option) => option.installerId));
          const extra = rows
            .filter((row) => row.installerId && !seen.has(row.installerId))
            .map((row) => ({
              installerId: row.installerId as string,
              label: masterOptionLabel(
                row.installerName ?? 'Мастер удалён из справочника',
                row.installerGrade
              ),
            }));
          return extra.length ? [...current, ...extra] : current;
        });
      })
      .catch(() => {
        // журнал недоступен — список ограничен мастерами, привязанными к заказу
      });
  };

  const handlePackageClear = () => {
    setSelectedPackage(null);
    setContractSearch('');
    setPackageMasters([]);
    setInstallerId('');
  };

  const amountNumber = Number(amount.trim().replace(',', '.'));
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0;
  const canSubmit = Boolean(selectedPackage) && installerId !== '' && paidAt !== '' && amountValid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPackage) {
      setError('Выберите заказ, по которому выдаётся аванс');
      return;
    }
    if (installerId === '') {
      setError('Выберите мастера этого заказа');
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

        <PackageOrderSearch
          id="advance-package-search"
          searchValue={contractSearch}
          selectedPackageId={selectedPackage?.id ?? ''}
          onSearchChange={(value) => {
            setContractSearch(value);
            if (selectedPackage) {
              setSelectedPackage(null);
              setPackageMasters([]);
              setInstallerId('');
            }
          }}
          onSelect={handlePackageSelect}
          onClear={handlePackageClear}
        />

        <div data-modal-form-group>
          <label htmlFor="advance-contract-number">Номер договора</label>
          <input
            id="advance-contract-number"
            type="text"
            value={contractNumber}
            placeholder="подставится из выбранного заказа"
            readOnly
          />
        </div>

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
              {!selectedPackage
                ? 'Сначала выберите заказ'
                : packageMasters.length === 0
                  ? 'У заказа нет мастеров'
                  : '— выбрать мастера —'}
            </option>
            {packageMasters.map((option) => (
              <option key={option.installerId} value={option.installerId}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedPackage && packageMasters.length === 0 ? (
            <p data-modal-form-hint>
              К этому заказу не привязаны мастера — привяжите их в модалке «Заказ-наряды» договора
              (вкладка «Интерактивная итоговая смета»).
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
