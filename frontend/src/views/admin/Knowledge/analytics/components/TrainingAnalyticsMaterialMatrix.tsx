'use client';

import { useMemo, useState } from 'react';

import type { KnowledgeTrainingAnalytics } from '@/shared/api/admin-knowledge';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';
import {
  formatEmployeeName,
  formatPercentWithSymbol,
  getMaterialTypeLabel,
} from '../knowledge-training-analytics.utils';
import { TrainingAnalyticsCollapsibleSection } from './TrainingAnalyticsCollapsibleSection';

type TrainingAnalyticsMaterialMatrixProps = {
  employeeMaterialStatus: KnowledgeTrainingAnalytics['employeeMaterialStatus'];
  employees: KnowledgeTrainingAnalytics['employees'];
  categories: KnowledgeTrainingAnalytics['categories'];
};

function statusLabel(
  status: 'completed' | 'in_progress' | 'not_started',
  progressPercent: number | null
): string {
  if (status === 'completed') return 'Завершено';
  if (status === 'in_progress') {
    return progressPercent != null
      ? `В процессе (${formatPercentWithSymbol(progressPercent)})`
      : 'В процессе';
  }
  return 'Не начато';
}

function MaterialMatrixCategory({
  categoryName,
  materials,
  employees,
}: {
  categoryName: string;
  materials: KnowledgeTrainingAnalytics['employeeMaterialStatus'];
  employees: KnowledgeTrainingAnalytics['employees'];
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = useMemo(() => {
    let count = 0;
    for (const material of materials) {
      for (const row of material.employeeStatus) {
        if (row.status === 'completed') count += 1;
      }
    }
    return count;
  }, [materials]);
  const totalCells = materials.length * employees.length;

  return (
    <div className={styles.materialMatrixCategory}>
      <button
        type="button"
        className={styles.materialMatrixCategoryToggle}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className={styles.categoryProgressChevron} aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
        <span className={styles.materialMatrixCategoryTitle}>{categoryName}</span>
        <span className={styles.materialMatrixCategoryMeta}>
          {materials.length} мат. ·{' '}
          {formatPercentWithSymbol(totalCells > 0 ? (completedCount / totalCells) * 100 : 0)}{' '}
          завершено
        </span>
      </button>

      {expanded && (
        <div className={styles.tableScroll}>
          <table className={`${styles.table} ${styles.materialMatrixTable}`}>
            <thead>
              <tr>
                <th className={styles.materialMatrixMaterialCol}>Материал</th>
                {employees.map((employee) => (
                  <th
                    key={employee.userId}
                    className={styles.materialMatrixEmployeeCol}
                    title={employee.email}
                  >
                    <span className={styles.materialMatrixEmployeeName}>
                      {formatEmployeeName(employee)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.materialId}>
                  <td className={styles.materialMatrixMaterialCol}>
                    <span className={styles.materialMatrixMaterialTitle}>{material.title}</span>
                    <div className={styles.tableMeta}>
                      {getMaterialTypeLabel(material.type)}
                      {material.hasQuiz ? ' · тест' : ''}
                    </div>
                  </td>
                  {employees.map((employee) => {
                    const statusRow = material.employeeStatus.find(
                      (row) => row.userId === employee.userId
                    );
                    const status = statusRow?.status ?? 'not_started';
                    const progressPercent = statusRow?.progressPercent ?? null;
                    const statusClass =
                      status === 'completed'
                        ? styles.materialStatusCompleted
                        : status === 'in_progress'
                          ? styles.materialStatusInProgress
                          : styles.materialStatusNotStarted;

                    return (
                      <td key={employee.userId} className={styles.materialMatrixEmployeeCol}>
                        <span
                          className={`${styles.materialMatrixCell} ${statusClass}`}
                          title={`${formatEmployeeName(employee)} — ${material.title}: ${statusLabel(status, progressPercent)}`}
                          aria-label={statusLabel(status, progressPercent)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TrainingAnalyticsMaterialMatrix({
  employeeMaterialStatus,
  employees,
  categories,
}: TrainingAnalyticsMaterialMatrixProps) {
  const materialsByCategory = useMemo(() => {
    const map = new Map<string, KnowledgeTrainingAnalytics['employeeMaterialStatus']>();
    for (const material of employeeMaterialStatus) {
      const list = map.get(material.categoryId) ?? [];
      list.push(material);
      map.set(material.categoryId, list);
    }
    return map;
  }, [employeeMaterialStatus]);

  const categoryCount = useMemo(
    () => categories.filter((c) => (materialsByCategory.get(c.categoryId) ?? []).length > 0).length,
    [categories, materialsByCategory]
  );

  if (employeeMaterialStatus.length === 0 || employees.length === 0) {
    return null;
  }

  return (
    <TrainingAnalyticsCollapsibleSection
      title="Прохождение материалов по сотрудникам"
      hint="Матрица: какие материалы изучил каждый сотрудник. Раскройте категорию для таблицы."
      badge={`${employeeMaterialStatus.length} мат.`}
      defaultExpanded={false}
      compact
      headerExtra={
        <div className={styles.materialMatrixLegend}>
          <span className={styles.materialMatrixLegendItem}>
            <span className={`${styles.materialMatrixCell} ${styles.materialStatusCompleted}`} />
          </span>
          <span className={styles.materialMatrixLegendItem}>
            <span className={`${styles.materialMatrixCell} ${styles.materialStatusInProgress}`} />
          </span>
          <span className={styles.materialMatrixLegendItem}>
            <span className={`${styles.materialMatrixCell} ${styles.materialStatusNotStarted}`} />
          </span>
        </div>
      }
    >
      <div className={styles.materialMatrixCategories}>
        {categories.map((category) => {
          const materials = materialsByCategory.get(category.categoryId) ?? [];
          if (materials.length === 0) return null;

          return (
            <MaterialMatrixCategory
              key={category.categoryId}
              categoryName={category.categoryName}
              materials={materials}
              employees={employees}
            />
          );
        })}
      </div>
      {categoryCount === 0 ? (
        <p className={styles.cardHint}>Нет отслеживаемых материалов в категориях.</p>
      ) : null}
    </TrainingAnalyticsCollapsibleSection>
  );
}
