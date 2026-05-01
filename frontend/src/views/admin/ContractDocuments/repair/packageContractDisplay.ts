/** Пакет ремонта: данные для подписи «к какому договору прикреплён расчёт». */
import { contractDateToDdMmYyyy, formatContractDateDdMmYyyy } from './contractDateFormat';

export type PackageContractSource = {
  formData: Record<string, unknown>;
  crmContract?: { contractNumber: string; contractDate: string } | null;
};

function repairFormContractBlock(
  formData: Record<string, unknown>
): Record<string, unknown> | null {
  const root = formData?.contract;
  if (!root || typeof root !== 'object') return null;
  return root as Record<string, unknown>;
}

/** Номер договора: из CRM или из вкладки «Данные» пакета (поле «Номер договора»). */
export function getDisplayContractNumber(pkg: PackageContractSource): string {
  const crm = pkg.crmContract?.contractNumber?.trim();
  if (crm) return crm;
  const c = repairFormContractBlock(pkg.formData);
  const num = typeof c?.number === 'string' ? c.number.trim() : '';
  return num || '—';
}

/** Дата договора для подписи в списках (дд.мм.гггг). */
export function getDisplayContractDate(pkg: PackageContractSource): string {
  if (pkg.crmContract?.contractDate) {
    const dt = new Date(pkg.crmContract.contractDate);
    if (Number.isNaN(dt.getTime())) return '—';
    return formatContractDateDdMmYyyy(dt);
  }
  const c = repairFormContractBlock(pkg.formData);
  const dateRaw = typeof c?.date === 'string' ? c.date.trim() : '';
  if (!dateRaw) return '—';
  const normalized = contractDateToDdMmYyyy(dateRaw);
  return normalized.trim() || '—';
}
