'use client';

import type { Measurement } from '@/shared/api/admin-crm';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { PublishIcon } from '@/shared/ui/icons';

import styles from '../list/MeasurementsPage.module.css';

const COMPLETABLE_STATUSES = new Set(['NEW', 'ASSIGNED', 'IN_PROGRESS']);

export function canCompleteMyMeasurement(status: string): boolean {
  return COMPLETABLE_STATUSES.has(status);
}

type MyMeasurementSurveyorActionsProps = {
  item: Measurement;
  onComplete: (item: Measurement) => void;
  disabled?: boolean;
};

export function MyMeasurementSurveyorActions({
  item,
  onComplete,
  disabled = false,
}: MyMeasurementSurveyorActionsProps) {
  if (!canCompleteMyMeasurement(item.status)) return null;

  return (
    <div className={styles.actions}>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Отметить выполненным"
        title="Выполнен"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onComplete(item);
        }}
      >
        <PublishIcon />
      </AdminTableIconButton>
    </div>
  );
}
