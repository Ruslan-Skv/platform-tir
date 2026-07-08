'use client';

import { useMemo } from 'react';

import type { KnowledgeTrainingAnalytics } from '@/shared/api/admin-knowledge';

import styles from '../KnowledgeTrainingAnalyticsPage.module.css';
import {
  formatEmployeeName,
  formatPercentWithSymbol,
  getMaterialTypeLabel,
} from '../knowledge-training-analytics.utils';

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

  if (employeeMaterialStatus.length === 0 || employees.length === 0) {
    return null;
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Прохождение материалов по сотрудникам</h2>
        <div className={styles.materialMatrixLegend}>
          <span className={styles.materialMatrixLegendItem}>
            <span className={`${styles.materialMatrixCell} ${styles.materialStatusCompleted}`} />
            Завершено
          </span>
          <span className={styles.materialMatrixLegendItem}>
            <span className={`${styles.materialMatrixCell} ${styles.materialStatusInProgress}`} />В
            процессе
          </span>
          <span className={styles.materialMatrixLegendItem}>
            <span className={`${styles.materialMatrixCell} ${styles.materialStatusNotStarted}`} />
            Не начато
          </span>
        </div>
      </div>
      <p className={styles.cardHint}>
        Матрица по каждой категории: какие материалы изучил каждый сотрудник. Наведите на ячейку для
        подробностей.
      </p>

      <div className={styles.materialMatrixCategories}>
        {categories.map((category) => {
          const materials = materialsByCategory.get(category.categoryId) ?? [];
          if (materials.length === 0) return null;

          return (
            <div key={category.categoryId} className={styles.materialMatrixCategory}>
              <h3 className={styles.materialMatrixCategoryTitle}>{category.categoryName}</h3>
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
                          {formatEmployeeName(employee)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr key={material.materialId}>
                        <td className={styles.materialMatrixMaterialCol}>
                          {material.title}
                          <div className={styles.tableMeta}>
                            {getMaterialTypeLabel(material.type)}
                            {material.hasQuiz ? ' · с тестом' : ''}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
