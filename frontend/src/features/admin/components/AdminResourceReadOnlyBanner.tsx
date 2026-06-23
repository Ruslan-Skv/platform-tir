'use client';

import styles from './AdminResourceReadOnlyBanner.module.css';

type AdminResourceReadOnlyBannerProps = {
  sectionLabel: string;
  canParticipate: boolean;
};

export function AdminResourceReadOnlyBanner({
  sectionLabel,
  canParticipate,
}: AdminResourceReadOnlyBannerProps) {
  return (
    <p className={styles.banner} data-modal-form-hint role="status">
      {canParticipate ? (
        <>
          Режим участия: раздел «{sectionLabel}» доступен для изучения — можно комментировать,
          отмечать материалы и проходить тесты. Управление разделом отключено.
        </>
      ) : (
        <>
          Режим просмотра: раздел «{sectionLabel}» доступен только для чтения. Создание, изменение и
          взаимодействие с материалами отключены.
        </>
      )}
    </p>
  );
}
