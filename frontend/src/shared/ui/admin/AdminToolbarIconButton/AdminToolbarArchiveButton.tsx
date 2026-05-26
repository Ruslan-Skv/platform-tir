'use client';

import { AdminArchiveIcon, AdminArchiveListIcon } from './AdminArchiveIcon';
import styles from './AdminToolbarArchiveButton.module.css';
import type { AdminToolbarIconButtonProps } from './AdminToolbarIconButton';
import { AdminToolbarIconButton } from './AdminToolbarIconButton';
import toolbarBadgeStyles from './AdminToolbarTrashButton.module.css';

export type AdminToolbarArchiveButtonProps = Omit<AdminToolbarIconButtonProps, 'children'> & {
  /** Число записей в архиве; при > 0 показывается бейдж */
  archiveCount?: number;
  /** Режим просмотра архива (иконка «к списку») */
  archiveView?: boolean;
};

function formatArchiveBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function archiveAriaLabel(base: string, count: number, archiveView: boolean): string {
  if (archiveView) return `${base}: вернуться к активным`;
  if (count <= 0) return `${base}: пусто`;
  const n = count > 99 ? 'более 99' : String(count);
  return `${base}, в архиве ${n}`;
}

export function AdminToolbarArchiveButton({
  archiveCount = 0,
  archiveView = false,
  title,
  'aria-label': ariaLabel,
  className,
  ...rest
}: AdminToolbarArchiveButtonProps) {
  const hasArchived = archiveCount > 0;
  const baseTitle = title ?? 'Архив';
  const resolvedTitle = archiveView
    ? 'Вернуться к активным'
    : hasArchived
      ? `${baseTitle} (${archiveCount > 99 ? '99+' : archiveCount})`
      : baseTitle;
  const resolvedAriaLabel = archiveAriaLabel(ariaLabel ?? baseTitle, archiveCount, archiveView);

  return (
    <span className={toolbarBadgeStyles.wrap}>
      <AdminToolbarIconButton
        className={[styles.button, archiveView ? styles.archiveViewActive : '', className]
          .filter(Boolean)
          .join(' ')}
        title={resolvedTitle}
        aria-label={resolvedAriaLabel}
        aria-pressed={archiveView}
        {...rest}
      >
        {archiveView ? <AdminArchiveListIcon /> : <AdminArchiveIcon />}
      </AdminToolbarIconButton>
      {hasArchived ? (
        <span className={toolbarBadgeStyles.badge} aria-hidden>
          {formatArchiveBadgeCount(archiveCount)}
        </span>
      ) : null}
    </span>
  );
}
