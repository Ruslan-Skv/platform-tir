'use client';

import type { Dispatch, SetStateAction } from 'react';

import { uploadPackageDrawingPhoto } from '@/shared/api/admin-contract-document-packages';

import { PACKAGE_DRAWING_PHOTOS_MAX } from '../../form';
import type { PackageFormData } from '../../form';
import { PackageAttachedPhotosTab } from '../attachedPhotosTab/PackageAttachedPhotosTab';

export type PackageDrawingsTabProps = {
  packageId: string;
  form: PackageFormData;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
};

/** Вкладка «Чертежи» (Потолки): картинки с чертежами (до 10 изображений). */
export function PackageDrawingsTab({
  packageId,
  form,
  setForm,
  touchPackageData,
}: PackageDrawingsTabProps) {
  return (
    <PackageAttachedPhotosTab
      packageId={packageId}
      inputId="package-drawing-photo-input"
      title="Чертежи"
      hint="Прикрепите картинки с чертежами потолков (jpg, png, webp, gif, до 8 МБ) — не более 10 шт. Чертежи можно отправить заказчику на ознакомление и подписание вместе с документами."
      itemNoun="чертеж"
      addButtonLabel="Добавить чертёж"
      emptyStateText="Чертежи ещё не прикреплены."
      photos={form.drawingPhotoUrls}
      maxPhotos={PACKAGE_DRAWING_PHOTOS_MAX}
      uploadPhoto={uploadPackageDrawingPhoto}
      onAppendPhoto={(imageUrl) => {
        setForm((prev) => ({
          ...prev,
          drawingPhotoUrls: [...prev.drawingPhotoUrls, imageUrl].slice(
            0,
            PACKAGE_DRAWING_PHOTOS_MAX
          ),
        }));
        touchPackageData();
      }}
      onRemovePhoto={(index) => {
        setForm((prev) => ({
          ...prev,
          drawingPhotoUrls: prev.drawingPhotoUrls.filter((_, i) => i !== index),
        }));
        touchPackageData();
      }}
    />
  );
}
