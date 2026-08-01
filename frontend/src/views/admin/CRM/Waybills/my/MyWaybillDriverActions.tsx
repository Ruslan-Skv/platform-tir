'use client';

import type { WaybillTask } from '@/shared/api/admin-waybills';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { FailIcon, PublishIcon } from '@/shared/ui/icons';

import styles from '../shared/Waybills.module.css';

type MyWaybillDriverActionsProps = {
  item: WaybillTask;
  onComplete: (item: WaybillTask) => void;
  onFail: (item: WaybillTask) => void;
};

export function MyWaybillDriverActions({ item, onComplete, onFail }: MyWaybillDriverActionsProps) {
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
