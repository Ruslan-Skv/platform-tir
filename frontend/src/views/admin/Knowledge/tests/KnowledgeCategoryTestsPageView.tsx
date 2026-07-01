'use client';

import { createPortal } from 'react-dom';

import {
  KNOWLEDGE_TESTS_RESOURCE_ID,
  getKnowledgeTestsResourceLabel,
} from '@/shared/config/admin-knowledge-resources';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminAccessIcon } from '@/shared/ui/icons/AdminAccessIcon';
import { AccessModal } from '@/widgets/admin/Sidebar/AccessModal';

import { KnowledgeBackLink } from '../shared/KnowledgeBackLink';
import { KnowledgeCategoryQuiz } from '../shared/KnowledgeCategoryQuiz';
import styles from './KnowledgeCategoryTestsPage.module.css';
import type { KnowledgeCategoryTestsPageModel } from './hooks/useKnowledgeCategoryTestsPage';

type KnowledgeCategoryTestsPageViewProps = {
  model: KnowledgeCategoryTestsPageModel;
};

export function KnowledgeCategoryTestsPageView({ model }: KnowledgeCategoryTestsPageViewProps) {
  const {
    canView,
    loading,
    error,
    summaries,
    selectedCategoryId,
    selectedSummary,
    handleCategorySelect,
    isSuperAdmin,
    categoryAccessModal,
    setCategoryAccessModal,
    openCategoryAccessModal,
    testsBlockAccessModal,
    setTestsBlockAccessModal,
    openTestsBlockAccessModal,
  } = model;

  if (!canView) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <KnowledgeBackLink href="/admin/knowledge">← Территория знаний</KnowledgeBackLink>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Тесты</h1>
          {isSuperAdmin ? (
            <AdminTableIconButton
              aria-label="Доступ к разделу «Тесты»"
              title="Доступ: настройки видимости раздела «Тесты» для ролей и пользователей"
              onClick={openTestsBlockAccessModal}
            >
              <AdminAccessIcon size={16} />
            </AdminTableIconButton>
          ) : null}
        </div>
        <p className={styles.subtitle}>
          Итоговые тесты по категориям: все вопросы из материалов категории объединены в один
          большой тест. Доступ к разделу «Тесты» и к тестам каждой категории настраивается отдельно
          от доступа к материалам.
        </p>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <div className={styles.loading}>Загрузка…</div>
      ) : summaries.length === 0 ? (
        <div className={styles.empty}>
          Пока нет категорий с тестами. Добавьте тесты к статьям в материалах обучающей платформы.
        </div>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>Категории</h2>
            <div className={styles.categoryList}>
              {summaries.map((summary) => {
                const isActive = summary.category.id === selectedCategoryId;
                const best = summary.myBestAttempt;

                return (
                  <div key={summary.category.id} className={styles.categoryItem}>
                    <button
                      type="button"
                      className={`${styles.categoryChip} ${isActive ? styles.categoryChipActive : ''}`}
                      onClick={() => handleCategorySelect(summary.category.id)}
                    >
                      <span>
                        {summary.category.name}
                        {best ? (
                          <span
                            className={`${styles.categoryStatus} ${best.passed ? styles.categoryStatusPassed : styles.categoryStatusFailed}`}
                          >
                            {best.passed ? '✓ пройден' : `${best.scorePercent}%`}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.categoryMeta}>{summary.questionCount} вопр.</span>
                    </button>
                    {isSuperAdmin ? (
                      <AdminTableIconButton
                        aria-label={`Доступ к тестам категории «${summary.category.name}»`}
                        title={`Доступ: настройки видимости тестов категории «${summary.category.name}» для ролей и пользователей`}
                        onClick={() => openCategoryAccessModal(summary)}
                      >
                        <AdminAccessIcon size={16} />
                      </AdminTableIconButton>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>

          <main className={styles.main}>
            {selectedSummary ? (
              <KnowledgeCategoryQuiz
                categoryId={selectedSummary.category.id}
                categoryName={selectedSummary.category.name}
                questionCountHint={selectedSummary.questionCount}
              />
            ) : (
              <div className={styles.empty}>Выберите категорию слева.</div>
            )}
          </main>
        </div>
      )}

      {categoryAccessModal && typeof document !== 'undefined'
        ? createPortal(
            <AccessModal
              resourceId={categoryAccessModal.resourceId}
              resourceLabel={categoryAccessModal.label}
              onClose={() => setCategoryAccessModal(null)}
            />,
            document.body
          )
        : null}

      {testsBlockAccessModal && typeof document !== 'undefined'
        ? createPortal(
            <AccessModal
              resourceId={KNOWLEDGE_TESTS_RESOURCE_ID}
              resourceLabel={getKnowledgeTestsResourceLabel()}
              onClose={() => setTestsBlockAccessModal(false)}
            />,
            document.body
          )
        : null}
    </div>
  );
}
