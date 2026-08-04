'use client';

import type { InstallationSchedule } from '@/shared/api/admin-installation-schedules';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { FailIcon, PublishIcon } from '@/shared/ui/icons';

import styles from '../shared/InstallationSchedules.module.css';

type Props = {
  item: InstallationSchedule;
  onComplete: (item: InstallationSchedule) => void;
  onFail: (item: InstallationSchedule) => void;
};

export function MyInstallationScheduleActions({ item, onComplete, onFail }: Props) {
  if (item.status !== 'PLANNED') return null;

  return (
    <div className={styles.actions}>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Выполнено"
        title="Выполнено"
        onClick={() => onComplete(item)}
      >
        <PublishIcon />
      </AdminTableIconButton>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Не выполнено"
        title="Не выполнено"
        onClick={() => onFail(item)}
      >
        <FailIcon />
      </AdminTableIconButton>
    </div>
  );
}
