'use client';

import type { WaybillTask } from '@/shared/api/admin-waybills';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon, DeleteIcon, EditIcon, FailIcon, PublishIcon } from '@/shared/ui/icons';

import styles from '../shared/Waybills.module.css';

type WaybillTaskRowActionsProps = {
  item: WaybillTask;
  currentUserId: string | null;
  onEdit: (item: WaybillTask) => void;
  onComplete: (item: WaybillTask) => void;
  onFail: (item: WaybillTask) => void;
  onCopy: (item: WaybillTask) => void;
  onDelete: (item: WaybillTask) => void;
  onReopen: (item: WaybillTask) => void;
  onOpenAttachments: (item: WaybillTask) => void;
};

function AttachmentsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export function WaybillTaskRowActions({
  item,
  currentUserId,
  onEdit,
  onComplete,
  onFail,
  onCopy,
  onDelete,
  onReopen,
  onOpenAttachments,
}: WaybillTaskRowActionsProps) {
  const attachmentsCount = item.attachments?.length ?? 0;
  return (
    <div className={styles.actions}>
      <AdminTableIconButton
        aria-label={
          attachmentsCount > 0 ? `Файлы задания (${attachmentsCount})` : 'Файлы задания — загрузить'
        }
        title={
          attachmentsCount > 0 ? `Файлы задания (${attachmentsCount})` : 'Файлы задания — загрузить'
        }
        className={
          attachmentsCount > 0 ? styles.attachmentIconButtonActive : styles.attachmentIconButton
        }
        onClick={() => onOpenAttachments(item)}
      >
        <AttachmentsIcon />
        {attachmentsCount > 0 ? (
          <span className={styles.attachmentCountBadge}>{attachmentsCount}</span>
        ) : null}
      </AdminTableIconButton>
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
            aria-label="Копировать / перенести"
            title="Копировать на другой день"
            onClick={() => onCopy(item)}
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
          {currentUserId && item.createdById === currentUserId ? (
            <AdminTableIconButton
              data-admin-mutation
              aria-label="В корзину"
              title="В корзину"
              onClick={() => onDelete(item)}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          ) : null}
        </>
      ) : (
        <AdminTableIconButton
          data-admin-mutation
          aria-label="В план"
          title="Вернуть в план"
          onClick={() => onReopen(item)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </AdminTableIconButton>
      )}
    </div>
  );
}
