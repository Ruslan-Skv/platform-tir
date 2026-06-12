'use client';

import type { BuildPersistedFormDataOptions } from '../../form/formDataTemplateStorage';
import type { PackageFormData } from '../../form/packageForm';
import { PackageHubModalView } from './PackageHubModalView';
import { usePackageHubModal } from './usePackageHubModal';

export type PackageHubModalProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  /** Номер договора из редактора — сразу в заголовке, без скачка после загрузки. */
  contractNumberLabel?: string;
  headerConcludedDateLabel?: string | null;
  getLiveForm?: () => PackageFormData;
  getLivePersistOptions?: () => BuildPersistedFormDataOptions;
  /** Блокировать этапы (например, несохранённые «Данные» в редакторе). */
  blockPipelineActions?: boolean;
  blockPipelineReason?: string;
};

export function PackageHubModal(props: PackageHubModalProps) {
  const model = usePackageHubModal(props);
  return <PackageHubModalView {...model} />;
}
