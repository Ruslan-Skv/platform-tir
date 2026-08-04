'use client';

import type { InstallationSchedule } from '@/shared/api/admin-installation-schedules';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon, DeleteIcon, EditIcon, FailIcon, PublishIcon } from '@/shared/ui/icons';

import styles from '../shared/InstallationSchedules.module.css';

type Props = {
  item: InstallationSchedule;
  onEdit: (item: InstallationSchedule) => void;
  onComplete: (item: InstallationSchedule) => void;
  onFail: (item: InstallationSchedule) => void;
  onReschedule: (item: InstallationSchedule) => void;
  onDelete: (item: InstallationSchedule) => void;
  onReopen: (item: InstallationSchedule) => void;
};

export function InstallationScheduleRowActions({
  item,
  onEdit,
  onComplete,
  onFail,
  onReschedule,
  onDelete,
  onReopen,
}: Props) {
  return (
    <div className={styles.actions}>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Изменить"
        title="Изменить"
        onClick={() => onEdit(item)}
      >
        <EditIcon />
      </AdminTableIconButton>
      {item.status === 'PLANNED' ? (
        <>
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Перенести"
            title="Перенести на другой день"
            onClick={() => onReschedule(item)}
          >
            <CopyIcon />
          </AdminTableIconButton>
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
          <AdminTableIconButton
            data-admin-mutation
            aria-label="В корзину"
            title="В корзину"
            onClick={() => onDelete(item)}
          >
            <DeleteIcon />
          </AdminTableIconButton>
        </>
      ) : (
        <AdminTableIconButton
          data-admin-mutation
          aria-label="В план"
          title="Вернуть в план"
          onClick={() => onReopen(item)}
        >
          <PublishIcon />
        </AdminTableIconButton>
      )}
    </div>
  );
}
