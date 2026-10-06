import type { PackageFormData } from '../form/packageForm';

/** Реквизиты Подрядчика для штампа ПЭП на документах («ООО «…», ИНН …»). */
export function buildContractorLabel(executor: {
  companyName?: string;
  inn?: string;
}): string | undefined {
  const company = executor.companyName?.trim();
  const inn = executor.inn?.trim();
  const label = [company || null, inn ? `ИНН ${inn}` : null].filter(Boolean).join(', ');
  return label || undefined;
}

/** Подписант со стороны Подрядчика для штампа ПЭП (ФИО + основание). */
export function buildContractorSignatory(executor: {
  directorNameNominative?: string;
  basis?: string;
}): string | undefined {
  const name = executor.directorNameNominative?.trim();
  const basis = executor.basis?.trim();
  const label = [name || null, basis || null].filter(Boolean).join(', ');
  return label || undefined;
}

export function packageContractorStampInfo(form: PackageFormData): {
  contractorLabel?: string;
  contractorSignatory?: string;
} {
  return {
    contractorLabel: buildContractorLabel(form.executor),
    contractorSignatory: buildContractorSignatory(form.executor),
  };
}
