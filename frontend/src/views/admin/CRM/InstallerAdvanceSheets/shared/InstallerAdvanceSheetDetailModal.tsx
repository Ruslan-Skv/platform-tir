'use client';

import { Modal } from '@/shared/ui/Modal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import {
  InstallerAdvanceSheetDetailPageView,
  SheetStatusBadge,
} from '../detail/InstallerAdvanceSheetDetailPageView';
import { useInstallerAdvanceSheetDetailPage } from '../hooks/useInstallerAdvanceSheetDetailPage';
import {
  downloadInstallerAdvanceSheetPdf,
  printInstallerAdvanceSheet,
} from '../print/installerAdvanceSheetPrint';
import styles from './InstallerAdvanceSheets.module.css';

/**
 * Карточка ведомости авансов в модалке: выплачивать, комментировать и печатать
 * можно прямо со страницы, не уходя на /admin/installer-advance-sheets/[id]
 * (напр., из чипов невыплаченных ведомостей план-графика ремонта).
 *
 * Модалка смонтирована постоянно и управляется isOpen — так срабатывают
 * стандартные анимации открытия/закрытия, как у остальных модалок админки
 * (при условном рендере закрытие обрывало бы анимацию).
 */
export function InstallerAdvanceSheetDetailModal({
  isOpen,
  sheetId,
  onClose,
}: {
  isOpen: boolean;
  /** id ведомости; пустая строка — ничего не загружено (модалка скрыта). */
  sheetId: string;
  onClose: () => void;
}) {
  const model = useInstallerAdvanceSheetDetailPage({
    sheetId,
    onDeleted: onClose,
    active: isOpen,
  });
  const sheet = model.sheet;

  /** Выплаченная ведомость — «замороженный» документ: правит только супер-админ. */
  const isFullyPaid = sheet?.status === 'PAID';
  const editLockedByPayment = Boolean(isFullyPaid && !model.canManagePayments);
  const canDelete = Boolean(sheet && model.canEditSheets && sheet.paidCount === 0);

  /** Шапка: статус ведомости + сервисные кнопки «Печать»/«PDF»/«Обновить». */
  const headerAside = sheet ? (
    <span className={styles.detailHeaderAside}>
      <SheetStatusBadge status={sheet.status} paidCount={sheet.paidCount} />
      {model.canEditSheets ? (
        <button
          type="button"
          className={styles.detailHeaderBtn}
          disabled={editLockedByPayment}
          title={
            isFullyPaid
              ? editLockedByPayment
                ? 'Ведомость выплачена — редактировать может только супер-админ'
                : 'Ведомость выплачена — редактирование доступно только супер-админу'
              : 'Ведомости редактируют ведущие специалисты и бригадиры'
          }
          onClick={() => model.setEditMode(true)}
        >
          Редактировать
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className={`${styles.detailHeaderBtn} ${styles.detailHeaderBtnDanger}`}
          title="Удалить ведомость — доступно, пока нет выданных строк"
          onClick={() => model.setDeleteOpen(true)}
        >
          Удалить
        </button>
      ) : null}
      <button
        type="button"
        className={styles.detailHeaderBtn}
        title="Открыть окно печати ведомости"
        onClick={() => printInstallerAdvanceSheet(sheet)}
      >
        Печать
      </button>
      <button
        type="button"
        className={styles.detailHeaderBtn}
        title="Скачать ведомость в PDF"
        onClick={() => void downloadInstallerAdvanceSheetPdf(sheet)}
      >
        PDF
      </button>
      <AdminListRefreshButton
        disabled={model.loading}
        busy={model.loading}
        title="Обновить ведомость"
        aria-label="Обновить ведомость"
        onClick={() => void model.refresh()}
      />
    </span>
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sheet ? `Ведомость № ${sheet.number}` : 'Ведомость'}
      titleAside={headerAside}
      size="xl"
      className={styles.detailModalPanel}
      showCloseButton
      alignTop
      compactOnMobile
    >
      <InstallerAdvanceSheetDetailPageView model={model} inModal />
    </Modal>
  );
}
