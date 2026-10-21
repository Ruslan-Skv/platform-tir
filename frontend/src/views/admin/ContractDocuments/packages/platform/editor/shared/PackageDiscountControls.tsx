'use client';

import type {
  PackageAddendumSlotDiscountType,
  PackageContractDiscountType,
} from '../../form/types';
import styles from './PackageDiscountControls.module.css';

/**
 * Ввод скидки с выбором типа: [%] или [руб.]. Без подписи и обёртки `.field` —
 * вкладывается в существующие поля вкладок, чтобы наследовать их стили.
 */
export function PackageDiscountControls({
  idPrefix,
  mode,
  percent,
  amount,
  disabled = false,
  /** Показать ли режим «руб.» (мебель — только %). */
  amountModeAvailable = true,
  selectClassName,
  inputClassName,
  onModeChange,
  onPercentChange,
  onAmountChange,
}: {
  idPrefix: string;
  mode: PackageContractDiscountType | undefined;
  percent: string;
  amount: string;
  disabled?: boolean;
  amountModeAvailable?: boolean;
  selectClassName?: string;
  inputClassName?: string;
  onModeChange: (mode: PackageContractDiscountType) => void;
  onPercentChange: (value: string) => void;
  onAmountChange: (value: string) => void;
}) {
  const isAmount = mode === 'AMOUNT' && amountModeAvailable;
  return (
    <div className={styles.discountControlsRow}>
      <select
        id={`${idPrefix}_type`}
        value={isAmount ? 'AMOUNT' : 'PERCENT'}
        disabled={disabled}
        className={[styles.discountControlsSelect, selectClassName].filter(Boolean).join(' ')}
        onChange={(e) =>
          onModeChange(e.target.value === 'AMOUNT' && amountModeAvailable ? 'AMOUNT' : 'PERCENT')
        }
      >
        <option value="PERCENT">%</option>
        {amountModeAvailable ? <option value="AMOUNT">руб.</option> : null}
      </select>
      <input
        id={`${idPrefix}_value`}
        inputMode="decimal"
        value={isAmount ? amount : percent}
        onChange={(e) =>
          isAmount ? onAmountChange(e.target.value) : onPercentChange(e.target.value)
        }
        placeholder="0"
        autoComplete="off"
        disabled={disabled}
        className={[styles.discountControlsInput, inputClassName].filter(Boolean).join(' ')}
      />
    </div>
  );
}

/**
 * Ввод скидки Д/с: наследование договоровой или своя (в % / рублях, замещает договоровую).
 * Своя скидка применяется к итогу Д/с, заказ-наряду по Д/с и сводке оплат.
 */
export function PackageAddendumSlotDiscountControls({
  idPrefix,
  mode,
  percent,
  amount,
  contractDiscountLabel,
  disabled = false,
  onChange,
}: {
  idPrefix: string;
  mode: PackageAddendumSlotDiscountType | undefined;
  percent: string;
  amount: string;
  /** Текущая скидка договора для варианта наследования, напр. «5%» или «нет». */
  contractDiscountLabel: string;
  disabled?: boolean;
  onChange: (patch: {
    discountType?: PackageAddendumSlotDiscountType;
    discountPercent?: string;
    discountAmount?: string;
  }) => void;
}) {
  const normalizedMode: PackageAddendumSlotDiscountType =
    mode === 'PERCENT' || mode === 'AMOUNT' ? mode : 'INHERIT';
  return (
    <div className={styles.discountControlsRow}>
      <select
        id={`${idPrefix}_mode`}
        value={normalizedMode}
        disabled={disabled}
        className={styles.discountControlsSelectFull}
        onChange={(e) =>
          onChange({
            discountType: e.target.value as PackageAddendumSlotDiscountType,
          })
        }
      >
        <option value="INHERIT">По договору ({contractDiscountLabel})</option>
        <option value="PERCENT">Своя, %</option>
        <option value="AMOUNT">Своя, руб.</option>
      </select>
      {normalizedMode !== 'INHERIT' ? (
        <input
          id={`${idPrefix}_value`}
          inputMode="decimal"
          value={normalizedMode === 'AMOUNT' ? amount : percent}
          onChange={(e) =>
            onChange(
              normalizedMode === 'AMOUNT'
                ? { discountAmount: e.target.value }
                : { discountPercent: e.target.value }
            )
          }
          placeholder="0"
          autoComplete="off"
          disabled={disabled}
          className={styles.discountControlsInput}
        />
      ) : null}
    </div>
  );
}

/** Строка-подсказка под полем скидки (пересчёт рублей в % и итог со скидкой). */
export function PackageDiscountHint({ children }: { children: React.ReactNode }) {
  if (children == null) return null;
  return <p className={styles.discountHint}>{children}</p>;
}
