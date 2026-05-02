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

/**
 * Номер для подписей в списках: то же, что подставляется как `{{contract.number}}` — сначала
 * значение из данных пакета («Номер договора»), иначе номер из привязанной карточки CRM.
 */
export function getDisplayContractNumber(pkg: PackageContractSource): string {
  const c = repairFormContractBlock(pkg.formData);
  const formNum = typeof c?.number === 'string' ? c.number.trim() : '';
  if (formNum) return formNum;
  const crm = pkg.crmContract?.contractNumber?.trim();
  return crm || '—';
}

/**
 * Дата для списков: как `{{contract.date}}` — сначала дата из формы пакета, иначе из CRM.
 */
export function getDisplayContractDate(pkg: PackageContractSource): string {
  const c = repairFormContractBlock(pkg.formData);
  const dateRaw = typeof c?.date === 'string' ? c.date.trim() : '';
  if (dateRaw) {
    const normalized = contractDateToDdMmYyyy(dateRaw);
    if (normalized.trim()) return normalized.trim();
  }
  if (pkg.crmContract?.contractDate) {
    const dt = new Date(pkg.crmContract.contractDate);
    if (!Number.isNaN(dt.getTime())) return formatContractDateDdMmYyyy(dt);
  }
  return '—';
}
