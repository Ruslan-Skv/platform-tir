'use client';

import { useEffect, useRef } from 'react';

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
  const openedOnceRef = useRef(false);

  useEffect(() => {
    if (!props.isOpen) openedOnceRef.current = false;
  }, [props.isOpen]);

  useEffect(() => {
    if (props.isOpen && model.hub.contentReady) openedOnceRef.current = true;
  }, [props.isOpen, model.hub.contentReady]);

  // Чтобы не было "дёрганья" по высоте при открытии:
  // первый показ делаем только после ready, но после него не закрываем Modal,
  // даже если hub временно уходит в loading (например, из-за refresh).
  const modalIsOpen = props.isOpen && (model.hub.contentReady || openedOnceRef.current);
  return <PackageHubModalView {...model} isOpen={modalIsOpen} />;
}
