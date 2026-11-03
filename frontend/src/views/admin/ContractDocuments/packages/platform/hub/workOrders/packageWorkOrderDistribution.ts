import distributionStyles from '../../../../styles/work-order-distribution.module.css';
import { buildFinalEstimateSummary } from '../../editor/shared/finalEstimateSummary';
import { mergePackageFormData } from '../../form/packageForm';

/**
 * Распределение заказ-наряда договора по мастерам: 'full' — все позиции
 * назначены мастерам, 'partial' — часть позиций, null — ничего не распределено
 * (или в заказ-наряде нет позиций).
 */
export type PackageWorkOrderDistribution = 'full' | 'partial' | null;

export type PackageWorkOrderDistributionInfo = {
  status: PackageWorkOrderDistribution;
  totalRows: number;
  assignedRows: number;
};

/**
 * Считает распределение позиций заказ-наряда (итоговой сметы: смета договора +
 * Д/с минус исключённые) по мастерам — тем же расчётом, что бейдж
 * неприкреплённых позиций в модалке «Заказ-наряды».
 */
export function getPackageWorkOrderDistributionInfo(
  packageFormData: unknown
): PackageWorkOrderDistributionInfo {
  const form = mergePackageFormData(packageFormData);
  const rows = buildFinalEstimateSummary(form).rows;
  const assignments = form.finalEstimateInstallerAssignments ?? {};
  const assignedRows = rows.filter((row) =>
    Boolean(assignments[row.key]?.installerId?.trim())
  ).length;
  const status: PackageWorkOrderDistribution =
    rows.length === 0 || assignedRows === 0
      ? null
      : assignedRows === rows.length
        ? 'full'
        : 'partial';
  return { status, totalRows: rows.length, assignedRows };
}

/** Класс фона иконки «Заказ-наряд»: зелёный — всё распределено, жёлтый — часть. */
export function packageWorkOrderDistributionClassName(
  status: PackageWorkOrderDistribution
): string | undefined {
  if (status === 'full') return distributionStyles.workOrderDistributedFull;
  if (status === 'partial') return distributionStyles.workOrderDistributedPartial;
  return undefined;
}

/** Дополнение тултипа иконки «Заказ-наряд» о распределении позиций мастерам. */
export function packageWorkOrderDistributionTitleSuffix(
  info: PackageWorkOrderDistributionInfo
): string {
  if (info.status === 'full') {
    return ` — все позиции распределены мастерам (${info.assignedRows} из ${info.totalRows})`;
  }
  if (info.status === 'partial') {
    return ` — распределено мастерам: ${info.assignedRows} из ${info.totalRows} позиций`;
  }
  return '';
}
