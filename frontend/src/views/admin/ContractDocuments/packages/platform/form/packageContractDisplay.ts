/** Пакет документов: данные для подписи «к какому договору прикреплён расчёт». */
import { contractDateToDdMmYyyy } from '../../../core/contractDateFormat';
import type { PackageFormData } from '../form/packageForm';

export type PackageContractSource = {
  formData: Record<string, unknown>;
};

/** Ключ в `formData` пакета: номер договора на момент копирования (для подписи «… копия»). */
export const REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY = '_repairCopyContractNumberBaseline';

function packageFormContractBlock(
  formData: Record<string, unknown>
): Record<string, unknown> | null {
  const root = formData?.contract;
  if (!root || typeof root !== 'object') return null;
  return root as Record<string, unknown>;
}

function contractNumberWithCopySuffix(formNumTrimmed: string, baselineRaw: unknown): string {
  const base = formNumTrimmed || '—';
  if (baselineRaw === undefined) return base;
  const baseline = typeof baselineRaw === 'string' ? baselineRaw.trim() : '';
  if (formNumTrimmed !== '' && formNumTrimmed === baseline) {
    return `${formNumTrimmed} копия`;
  }
  return base;
}

/**
 * Номер для подписей в списках: как `{{contract.number}}` — из данных пакета («Номер договора»).
 * Для пакета, созданного копированием: если номер не менялся относительно снимка при копии,
 * к отображению добавляется слово «копия» (не меняет сохранённое значение поля).
 */
export function getDisplayContractNumber(pkg: PackageContractSource): string {
  const fd = pkg.formData ?? {};
  const c = packageFormContractBlock(fd);
  const formNum = typeof c?.number === 'string' ? c.number.trim() : '';
  const baselineRaw = (fd as Record<string, unknown>)[REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY];
  return contractNumberWithCopySuffix(formNum, baselineRaw);
}

/** Номер договора для UI редактора (с суффиксом «копия» при неизменённом номере после копирования). */
export function getPackageContractNumberDisplayForForm(form: PackageFormData): string {
  return contractNumberWithCopySuffix(
    form.contract.number.trim(),
    form._repairCopyContractNumberBaseline
  );
}

/**
 * Дата для списков: как `{{contract.date}}` — из данных пакета.
 */
export function getDisplayContractDate(pkg: PackageContractSource): string {
  const c = packageFormContractBlock(pkg.formData);
  const dateRaw = typeof c?.date === 'string' ? c.date.trim() : '';
  if (dateRaw) {
    const normalized = contractDateToDdMmYyyy(dateRaw);
    if (normalized.trim()) return normalized.trim();
  }
  return '—';
}
