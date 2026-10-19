'use client';

import styles from './paid-percent-badge.module.css';

/** Уровни цвета: 0% / 1–69% / 70–99% (порог начала работ) / 100%. */
function badgeClass(percent: number): string {
  if (percent >= 100) return `${styles.badge} ${styles.badgeFull}`;
  if (percent >= 70) return `${styles.badge} ${styles.badgeMost}`;
  if (percent >= 1) return `${styles.badge} ${styles.badgePart}`;
  return `${styles.badge} ${styles.badgeNone}`;
}

/** Бейдж «опл. N%» в колонке «Стоимость» план-графиков: фон — по размеру оплаты. */
export function PaidPercentBadge({ percent }: { percent: number }) {
  return (
    <span className={badgeClass(percent)} title={`Оплачено ${percent}% от суммы к оплате`}>
      опл. {percent}%
    </span>
  );
}
