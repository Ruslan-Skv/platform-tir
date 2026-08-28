'use client';

import type { KanbanCard } from '@/shared/api/kanban/admin-kanban';

import styles from '../KanbanPage.module.css';
import {
  PRIORITY_LABELS,
  checklistProgress,
  formatDueDate,
  formatKanbanUser,
  isOverdue,
  userInitials,
} from '../shared/kanban.utils';

export type KanbanMobileCardItem = {
  card: KanbanCard;
  columnName: string;
  columnColor: string;
};

type Props = {
  items: KanbanMobileCardItem[];
  loading: boolean;
  onOpenCard: (id: string) => void;
};

export function KanbanMobileCards({ items, loading, onOpenCard }: Props) {
  return (
    <div className={styles.mobileCards} aria-label="Список карточек">
      {loading && items.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className={styles.mobileEmpty}>Карточек не найдено</p>
      ) : (
        items.map(({ card, columnName, columnColor }) => {
          const progress = checklistProgress(card.checklist);
          return (
            <button
              key={card.id}
              type="button"
              className={styles.mobileCard}
              onClick={() => onOpenCard(card.id)}
            >
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{card.title}</span>
                  <span className={styles.mobileCardMeta}>
                    <span
                      className={styles.mobileCardColumnDot}
                      style={{ background: columnColor || '#64748b' }}
                      aria-hidden
                    />
                    {columnName}
                    {card.dueDate ? ` · ${formatDueDate(card.dueDate)}` : ''}
                    {card.assignee ? ` · ${formatKanbanUser(card.assignee)}` : ''}
                  </span>
                </div>
                <span className={`${styles.priority} ${styles[`priority${card.priority}`]}`}>
                  {PRIORITY_LABELS[card.priority]}
                </span>
              </div>

              {card.labels.length > 0 ? (
                <div className={styles.mobileCardLabels}>
                  {card.labels.map((label) => (
                    <span key={label} className={styles.labelChip}>
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className={styles.mobileCardFooter}>
                {card.dueDate && isOverdue(card.dueDate) ? (
                  <span className={styles.mobileCardOverdue}>Просрочено</span>
                ) : null}
                {progress ? (
                  <span className={styles.checklistMini}>
                    ✓ {progress.done}/{progress.total}
                  </span>
                ) : null}
                {card.assignee ? (
                  <span className={styles.avatar} title={formatKanbanUser(card.assignee)}>
                    {userInitials(card.assignee)}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
