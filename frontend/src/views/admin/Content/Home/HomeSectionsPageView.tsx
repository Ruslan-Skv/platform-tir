'use client';

import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import styles from './HomeSectionsPage.module.css';
import { HomeSectionsSection } from './HomeSectionsSection';

export function HomeSectionsPageView() {
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitleGroup}>
            <h1 className={styles.title}>Главная страница</h1>
            <AdminSaveNotice visible={saveNoticeVisible} />
          </div>
        </div>
        <p className={styles.subtitle}>Управление секциями главной страницы сайта</p>
      </header>
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}
      <HomeSectionsSection
        onSaveStart={resetSaveFeedback}
        onSaveSuccess={showSaveSuccess}
        onSaveError={showSaveError}
      />
    </div>
  );
}
