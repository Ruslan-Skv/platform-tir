'use client';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import {
  DeleteIcon,
  EditIcon,
  FailIcon,
  PublishIcon,
  RescheduleIcon,
  ShareIcon,
} from '@/shared/ui/icons';
import { PackageWorkOrdersHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubIcon';
import { formatPackageWorkOrderHubModalTitle } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';

import styles from '../shared/InstallationSchedules.module.css';

type Props = {
  item: InstallationSchedule;
  onEdit: (item: InstallationSchedule) => void;
  onOpenWorkOrders: (item: InstallationSchedule) => void;
  onShare: (item: InstallationSchedule) => void;
  onComplete: (item: InstallationSchedule) => void;
  onFail: (item: InstallationSchedule) => void;
  onReschedule: (item: InstallationSchedule) => void;
  onDelete: (item: InstallationSchedule) => void;
  onReopen: (item: InstallationSchedule) => void;
};

export function InstallationScheduleRowActions({
  item,
  onEdit,
  onOpenWorkOrders,
  onShare,
  onComplete,
  onFail,
  onReschedule,
  onDelete,
  onReopen,
}: Props) {
  const hasPackage = Boolean(item.packageId?.trim());
  const workOrdersTitle = hasPackage
    ? formatPackageWorkOrderHubModalTitle(item.contractNumber || undefined)
    : 'Нет привязанного пакета договора — заказ-наряд недоступен';

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
      <AdminTableIconButton
        disabled={!hasPackage}
        aria-label={hasPackage ? `Открыть ${workOrdersTitle}` : workOrdersTitle}
        title={workOrdersTitle}
        onClick={() => {
          if (hasPackage) onOpenWorkOrders(item);
        }}
      >
        <PackageWorkOrdersHubIcon size={14} />
      </AdminTableIconButton>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Отправить монтажнику"
        title="Отправить монтажнику (Telegram, WhatsApp, MAX)"
        onClick={() => onShare(item)}
      >
        <ShareIcon />
      </AdminTableIconButton>
      {item.status === 'PLANNED' ? (
        <>
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Перенести"
            title="Перенести на другой день"
            onClick={() => onReschedule(item)}
          >
            <RescheduleIcon />
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
