import type { PackageFormData } from '../../../platform/form/packageForm';
import { formatContractsListActDate } from './contractsListUtils';

export type ContractsListActPhotoItem = {
  key: string;
  title: string;
  dateLabel: string;
  src: string;
};

export function contractsListWorkStartActDateCell(form: PackageFormData): string {
  const signedAt = form.repairWorkStartActSignedAt?.trim();
  if (!signedAt) return '—';
  return formatContractsListActDate(signedAt);
}

export function contractsListContractCloseActDateCell(form: PackageFormData): string {
  const signedAt = form.repairContractCloseActSignedAt?.trim();
  if (!signedAt) return '—';
  return formatContractsListActDate(signedAt);
}

export function contractsListAttachedActPhotosFromForm(
  form: PackageFormData,
  publicUploadUrl: (path: string) => string
): ContractsListActPhotoItem[] {
  const items: ContractsListActPhotoItem[] = [];
  const workPhoto = form.repairWorkStartActPhotoUrl?.trim();
  if (workPhoto) {
    items.push({
      key: 'work-start',
      title: 'Акт начала работ',
      dateLabel: formatContractsListActDate(form.repairWorkStartActSignedAt ?? ''),
      src: publicUploadUrl(workPhoto),
    });
  }
  const closePhoto = form.repairContractCloseActPhotoUrl?.trim();
  if (closePhoto) {
    items.push({
      key: 'contract-close',
      title: 'Акт сдачи-приёмки (закрытие договора)',
      dateLabel: formatContractsListActDate(form.repairContractCloseActSignedAt ?? ''),
      src: publicUploadUrl(closePhoto),
    });
  }
  return items;
}
