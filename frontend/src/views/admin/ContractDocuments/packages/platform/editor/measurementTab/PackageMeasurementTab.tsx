'use client';

import type { Dispatch, SetStateAction } from 'react';

import { uploadPackageMeasurementPhoto } from '@/shared/api/admin-contract-document-packages';

import { PACKAGE_MEASUREMENT_PHOTOS_MAX } from '../../form';
import type { PackageFormData } from '../../form';
import { PackageAttachedPhotosTab } from '../attachedPhotosTab/PackageAttachedPhotosTab';

export type PackageMeasurementTabProps = {
  packageId: string;
  form: PackageFormData;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
};

/** Вкладка «Замер»: фото с результатами замера (до 5 изображений). */
export function PackageMeasurementTab({
  packageId,
  form,
  setForm,
  touchPackageData,
}: PackageMeasurementTabProps) {
  return (
    <PackageAttachedPhotosTab
      packageId={packageId}
      inputId="package-measurement-photo-input"
      title="Замер"
      hint="Прикрепите фотографии с результатами замера (jpg, png, webp, gif, до 8 МБ) — не более 5 шт. Нажмите на фото, чтобы открыть в полном размере."
      itemNoun="фото замера"
      addButtonLabel="Добавить фото"
      emptyStateText="Фото замера ещё не прикреплены."
      photos={form.measurementPhotoUrls}
      maxPhotos={PACKAGE_MEASUREMENT_PHOTOS_MAX}
      uploadPhoto={uploadPackageMeasurementPhoto}
      onAppendPhoto={(imageUrl) => {
        setForm((prev) => ({
          ...prev,
          measurementPhotoUrls: [...prev.measurementPhotoUrls, imageUrl].slice(
            0,
            PACKAGE_MEASUREMENT_PHOTOS_MAX
          ),
        }));
        touchPackageData();
      }}
      onRemovePhoto={(index) => {
        setForm((prev) => ({
          ...prev,
          measurementPhotoUrls: prev.measurementPhotoUrls.filter((_, i) => i !== index),
        }));
        touchPackageData();
      }}
    />
  );
}
