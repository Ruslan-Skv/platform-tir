import { amountToRussianWords } from '../../../core/amountToRussianWords';
import { formatMoneyWholeGrouped, formatMoneyWholePlain } from './moneyWhole';
import type {
  PackageAddendumSlotDiscountType,
  PackageContractDiscountType,
  PackageFormData,
} from './types';

/** Процент из поля формы: ≥ 0 без верхнего предела; пусто и нечисло → 0. */
export function parseNonNegativePercent(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Процент скидки по договору из поля формы: 0…100, пусто и нечисло → 0. */
export function parsePackageContractDiscountPercent(raw: string | undefined | null): number {
  return Math.min(100, parseNonNegativePercent(raw));
}

/** Сумма скидки в рублях из поля формы: ≥ 0; пусто и нечисло → 0. */
export function parseDiscountAmountRub(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/**
 * Эффективный % скидки из рублёвой суммы и базы (итог сметы/Д/с без скидки):
 * рубли ≥ базы → 100; пустая база → 0 (появится смета — пересчитается).
 */
export function deriveDiscountPercentFromAmount(
  amountRub: number,
  baseTotal: number | null | undefined
): number {
  if (!Number.isFinite(amountRub) || amountRub <= 0) return 0;
  if (!Number.isFinite(baseTotal ?? NaN) || (baseTotal ?? 0) <= 0) return 0;
  return Math.min(100, (amountRub / (baseTotal as number)) * 100);
}

/**
 * Производный % для поля формы: 6 знаков после запятой (копеечная точность
 * на суммах до ~10 млн руб.), запятая как разделитель.
 */
export function formatDiscountPercentForField(percent: number): string {
  const rounded = Math.round(percent * 1e6) / 1e6;
  if (!Number.isFinite(rounded) || rounded <= 0) return '';
  return String(rounded).replace('.', ',');
}

/** Короткий % для подписей в документах/подсказках: до 2 знаков без хвостовых нулей. */
export function formatDiscountPercentShort(percent: number): string {
  const rounded = Math.round(percent * 100) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) return '0';
  return String(rounded).replace('.', ',');
}

export function normalizeContractDiscountType(
  raw: unknown
): PackageContractDiscountType | undefined {
  return raw === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
}

export function normalizeAddendumSlotDiscountType(
  raw: unknown
): PackageAddendumSlotDiscountType | undefined {
  if (raw === 'PERCENT' || raw === 'AMOUNT') return raw;
  return 'INHERIT';
}

export type ResolvedContractDiscount = {
  mode: PackageContractDiscountType;
  /** Эффективный процент 0…100 (при AMOUNT — производный от итога сметы). */
  percent: number;
  /** Рублёвая сумма скидки (только для AMOUNT), иначе null. */
  amountRub: number | null;
  /** База пересчёта — итог сметы без скидки; null — смета не прикреплена. */
  baseTotal: number | null;
};

/** Скидка договора с учётом режима (%/рубли); база рублёвой скидки — итог сметы. */
export function resolveContractDiscount(form: PackageFormData): ResolvedContractDiscount {
  const baseRaw = form.estimate.snapshot?.total;
  const baseTotal =
    typeof baseRaw === 'number' && Number.isFinite(baseRaw) && baseRaw > 0 ? baseRaw : null;
  if (form.contract.discountType === 'AMOUNT') {
    const amountRub = parseDiscountAmountRub(form.contract.discountAmount);
    return {
      mode: 'AMOUNT',
      percent: deriveDiscountPercentFromAmount(amountRub, baseTotal),
      amountRub,
      baseTotal,
    };
  }
  return {
    mode: 'PERCENT',
    percent: parsePackageContractDiscountPercent(form.contract.discountPercent),
    amountRub: null,
    baseTotal,
  };
}

export type ResolvedAddendumSlotDiscount = {
  mode: PackageAddendumSlotDiscountType;
  /** Эффективный процент 0…100 (INHERIT — договоровой). */
  percent: number;
  /** Рублёвая сумма скидки (только для AMOUNT), иначе null. */
  amountRub: number | null;
  /** База пересчёта — итог добавляемых работ Д/с без скидки; null — смета Д/с пустая. */
  baseTotal: number | null;
  /** Своя скидка Д/с замещает договорную. */
  overridesContract: boolean;
};

/** Скидка Д/с: своя (%/рубли, база — итог работ Д/с) или договоровая (INHERIT). */
export function resolveAddendumSlotDiscount(
  form: PackageFormData,
  slotIndex0: number
): ResolvedAddendumSlotDiscount {
  const contractPercent = resolveContractDiscount(form).percent;
  const slot = form.addendumSlots[slotIndex0];
  if (!slot) {
    return {
      mode: 'INHERIT',
      percent: contractPercent,
      amountRub: null,
      baseTotal: null,
      overridesContract: false,
    };
  }
  const baseRaw = slot.snapshot?.total;
  const baseTotal =
    typeof baseRaw === 'number' && Number.isFinite(baseRaw) && baseRaw > 0 ? baseRaw : null;
  if (slot.discountType === 'AMOUNT') {
    const amountRub = parseDiscountAmountRub(slot.discountAmount);
    return {
      mode: 'AMOUNT',
      percent: deriveDiscountPercentFromAmount(amountRub, baseTotal),
      amountRub,
      baseTotal,
      overridesContract: true,
    };
  }
  if (slot.discountType === 'PERCENT') {
    return {
      mode: 'PERCENT',
      percent: parsePackageContractDiscountPercent(slot.discountPercent ?? ''),
      amountRub: null,
      baseTotal,
      overridesContract: true,
    };
  }
  return {
    mode: 'INHERIT',
    percent: contractPercent,
    amountRub: null,
    baseTotal,
    overridesContract: false,
  };
}

/** Эффективный % скидки Д/с (INHERIT → договорной). */
export function resolveAddendumSlotDiscountPercent(
  form: PackageFormData,
  slotIndex0: number
): number {
  return resolveAddendumSlotDiscount(form, slotIndex0).percent;
}

/**
 * Пересчёт производных процентов скидок: при режиме «рубли» % зависит от базы
 * (итога сметы / итога работ Д/с), поэтому обновляется при каждой правке базы.
 * Идемпотентно; для режима «%» ничего не меняет.
 */
export function syncPackageDiscountDerivedFields(form: PackageFormData): PackageFormData {
  let next = form;
  if (form.contract.discountType === 'AMOUNT') {
    const derived = formatDiscountPercentForField(resolveContractDiscount(form).percent);
    if (form.contract.discountPercent !== derived) {
      next = { ...next, contract: { ...next.contract, discountPercent: derived } };
    }
  }
  let slotsChanged = false;
  const slots = form.addendumSlots.map((slot) => {
    if (slot.discountType !== 'AMOUNT') return slot;
    const derived = formatDiscountPercentForField(
      deriveDiscountPercentFromAmount(
        parseDiscountAmountRub(slot.discountAmount),
        slot.snapshot?.total
      )
    );
    if ((slot.discountPercent ?? '') !== derived) {
      slotsChanged = true;
      return { ...slot, discountPercent: derived };
    }
    return slot;
  });
  if (slotsChanged) {
    next = { ...next, addendumSlots: slots as PackageFormData['addendumSlots'] };
  }
  return next;
}

/** Подсказка под полем скидки договора: как рубли пересчитались в % и что вышло. */
export function contractDiscountHint(form: PackageFormData): string | null {
  if (form.contract.discountType !== 'AMOUNT') return null;
  const amountRub = parseDiscountAmountRub(form.contract.discountAmount);
  if (amountRub <= 0) return null;
  const base = resolveContractDiscount(form).baseTotal;
  if (base == null) return 'Прикрепите смету — процент скидки посчитается от её итога.';
  const percent = deriveDiscountPercentFromAmount(amountRub, base);
  const after = base - Math.min(amountRub, base);
  return `≈ ${formatDiscountPercentShort(percent)}% → итого со скидкой ${formatMoneyWholeGrouped(after)} руб.`;
}

/** Подсказка под полем скидки Д/с (режим «руб.»): пересчёт в % от итога работ Д/с. */
export function addendumSlotDiscountHint(form: PackageFormData, slotIndex0: number): string | null {
  const slot = form.addendumSlots[slotIndex0];
  if (!slot || slot.discountType !== 'AMOUNT') return null;
  const amountRub = parseDiscountAmountRub(slot.discountAmount);
  if (amountRub <= 0) return null;
  const base = slot.snapshot?.total;
  if (typeof base !== 'number' || !Number.isFinite(base) || base <= 0) {
    return 'Прикрепите расчёты — процент посчитается от итога работ Д/с.';
  }
  const percent = deriveDiscountPercentFromAmount(amountRub, base);
  const after = base - Math.min(amountRub, base);
  return `≈ ${formatDiscountPercentShort(percent)}% → итого со скидкой ${formatMoneyWholeGrouped(after)} руб.`;
}

export function packageContractDiscountMoneyFactor(discountPercent: number): number {
  const p = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0, 1 - p / 100);
}

export function applyPackageContractDiscountToAmount(
  amount: number,
  discountPercent: number
): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount * packageContractDiscountMoneyFactor(discountPercent);
}

export function applyPackageContractDiscountToNullableBase(
  base: number | null | undefined,
  discountPercentRaw: string | undefined | null
): number | null {
  if (base == null || !Number.isFinite(base)) return null;
  return applyPackageContractDiscountToAmount(
    base,
    parsePackageContractDiscountPercent(discountPercentRaw ?? '')
  );
}

/** Поля суммы договора из числа (после скидки), как при автозаполнении из сметы; итог — целыми рублями. */
export function packageEstimateTotalToContractFields(totalAfterDiscount: number | null): {
  totalAmount: string;
  totalAmountWords: string;
  recommendedPrepayment: string;
} {
  if (totalAfterDiscount == null || !Number.isFinite(totalAfterDiscount)) {
    return {
      totalAmount: '',
      totalAmountWords: '',
      recommendedPrepayment: '',
    };
  }
  const totalAmount = formatMoneyWholePlain(totalAfterDiscount);
  return {
    totalAmount,
    totalAmountWords: amountToRussianWords(totalAmount),
    recommendedPrepayment: formatMoneyWholeGrouped(totalAfterDiscount * 0.7),
  };
}
