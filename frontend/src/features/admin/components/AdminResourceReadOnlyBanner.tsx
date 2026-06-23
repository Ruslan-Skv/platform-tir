'use client';

import styles from './AdminResourceReadOnlyBanner.module.css';

type AdminResourceReadOnlyBannerProps = {
  sectionLabel: string;
};

export function AdminResourceReadOnlyBanner({ sectionLabel }: AdminResourceReadOnlyBannerProps) {
  return (
    <p className={styles.banner} data-modal-form-hint role="status">
      Режим просмотра: раздел «{sectionLabel}» доступен только для чтения. Создание и изменение
      данных отключены.
    </p>
  );
}
