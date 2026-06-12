import styles from './CartPage.module.css';

export function ApprovedOrderBadge({ title = 'Проверено' }: { title?: string }) {
  return (
    <span className={styles.itemInOrderBadge} title={title} aria-hidden>
      <svg
        className={styles.doubleCheckIcon}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12l3 3 7-7" />
        <path d="M9 15l2 2 5-5" />
      </svg>
    </span>
  );
}

export function ReviewInProgressBadge({ title = 'В заказе на проверке' }: { title?: string }) {
  return (
    <span className={styles.itemInOrderBadge} title={title} aria-hidden>
      <svg
        className={styles.reviewProgressIconSmall}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className={styles.reviewProgressSpinnerArc}>
          <path strokeDasharray="28 56" d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z" />
        </g>
        <path className={styles.reviewProgressCheck} d="M7 12l3.5 3.5L17 9" />
      </svg>
    </span>
  );
}
