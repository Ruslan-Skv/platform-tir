'use client';

import Link from 'next/link';

import type { InstallerAdvanceSheetItem } from '@/shared/api/crm/admin-installer-advance-sheets';
import { formatInstallerAdvancePaymentMethod } from '@/shared/constants/installerAdvancePaymentMethod';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import isStyles from '@/views/admin/CRM/InstallerSettlements/InstallerSettlements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import type { InstallerAdvanceSheetDetailPageModel } from '../hooks/useInstallerAdvanceSheetDetailPage';
import {
  downloadInstallerAdvanceSheetPdf,
  printInstallerAdvanceSheet,
} from '../print/installerAdvanceSheetPrint';
import { InstallerAdvanceSheetForm } from '../shared/InstallerAdvanceSheetForm';
import styles from '../shared/InstallerAdvanceSheets.module.css';
import {
  IAS_ITEM_STATUS_LABELS,
  IAS_PACKAGE_STATUS_LABELS,
  formatIasDate,
  formatIasDateTime,
  formatIasGradeShort,
  formatIasMoney,
} from '../shared/installer-advance-sheets-page.constants';

function itemStatusTone(status: InstallerAdvanceSheetItem['status']): string {
  if (status === 'PAID') return 'paid';
  if (status === 'QUESTION') return 'question';
  return 'pending';
}

function SheetStatusBadge({ status, paidCount }: { status: string; paidCount: number }) {
  const label =
    status === 'PAID'
      ? 'Выплачена'
      : status === 'QUESTION'
        ? 'Есть вопросы'
        : paidCount > 0
          ? 'Выдано частично'
          : 'Ожидает выплаты';
  const tone =
    status === 'PAID'
      ? 'paid'
      : status === 'QUESTION'
        ? 'question'
        : paidCount > 0
          ? 'partial'
          : 'pending';
  return <span className={`${styles.statusBadge} ${styles[`status_${tone}`]}`}>{label}</span>;
}

export function InstallerAdvanceSheetDetailPageView({
  model,
}: {
  model: InstallerAdvanceSheetDetailPageModel;
}) {
  const {
    sheet,
    loading,
    message,
    setMessage,
    notice,
    canManagePayments,
    canEditSheets,
    canComment,
    refresh,
    editMode,
    setEditMode,
    saving,
    submitEdit,
    payTarget,
    payAt,
    setPayAt,
    payMethod,
    setPayMethod,
    payMethodLabels,
    paySubmitting,
    openPayModal,
    closePayModal,
    submitPay,
    unpayTarget,
    setUnpayTarget,
    unpaySubmitting,
    submitUnpay,
    deleteOpen,
    setDeleteOpen,
    deleteSubmitting,
    submitDelete,
    openCommentsItemId,
    toggleComments,
    commentDrafts,
    setCommentDraft,
    commentBusyItemId,
    submitComment,
    resolveQuestion,
  } = model;

  if (loading && !sheet) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${isStyles.pageFull}`}>
        <p className={styles.detailNote}>Загрузка…</p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${isStyles.pageFull}`}>
        {message ? (
          <div className={isStyles.pageMessage}>
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
              ×
            </button>
          </div>
        ) : null}
        <Link href="/admin/installer-advance-sheets" className={styles.detailBackLink}>
          ← Расчётники мастеров
        </Link>
      </div>
    );
  }

  const pendingCount = sheet.itemsCount - sheet.paidCount;
  const canDelete = canEditSheets && sheet.paidCount === 0;

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${isStyles.pageFull} ${cdHub.contractsListPage}`}
    >
      <Link href="/admin/installer-advance-sheets" className={styles.detailBackLink}>
        ← Расчётники мастеров
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <h1 className={cdHub.title}>Ведомость № {sheet.number}</h1>
              <SheetStatusBadge status={sheet.status} paidCount={sheet.paidCount} />
            </div>
          </div>
          <p className={styles.detailMetaRow}>
            <span>от {formatIasDate(sheet.createdAt)}</span>
            <span>
              Мастер:{' '}
              <strong>
                {sheet.installer.name}
                {formatIasGradeShort(sheet.installer.grade)
                  ? ` (${formatIasGradeShort(sheet.installer.grade)})`
                  : ''}
              </strong>
            </span>
            <span>Создал: {sheet.createdBy?.name || '—'}</span>
            <span>
              Выдано: {sheet.paidCount} из {sheet.itemsCount} на {formatIasMoney(sheet.paidAmount)}{' '}
              из {formatIasMoney(sheet.totalAmount)}
            </span>
          </p>
          {sheet.note?.trim() ? (
            <p className={styles.detailNote}>Примечание: {sheet.note}</p>
          ) : null}
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            type="button"
            className={styles.itemActionBtn}
            onClick={() => printInstallerAdvanceSheet(sheet)}
          >
            Печать
          </button>
          <button
            type="button"
            className={styles.itemActionBtn}
            onClick={() => void downloadInstallerAdvanceSheetPdf(sheet)}
          >
            PDF
          </button>
          {canManagePayments && pendingCount > 0 ? (
            <button
              type="button"
              data-admin-mutation
              className={`${styles.itemActionBtn} ${styles.itemActionPrimary}`}
              onClick={() => openPayModal({ kind: 'all' })}
            >
              Выплатить все ({pendingCount})
            </button>
          ) : null}
          {canEditSheets && !editMode ? (
            <button
              type="button"
              data-admin-mutation
              className={styles.itemActionBtn}
              onClick={() => setEditMode(true)}
            >
              Редактировать
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              data-admin-mutation
              className={`${styles.itemActionBtn} ${styles.itemActionDanger}`}
              onClick={() => setDeleteOpen(true)}
            >
              Удалить
            </button>
          ) : null}
          <AdminListRefreshButton
            disabled={loading}
            busy={loading}
            title="Обновить ведомость"
            aria-label="Обновить ведомость"
            onClick={() => void refresh()}
          />
        </div>
      </div>

      {message ? (
        <div className={isStyles.pageMessage}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className={isStyles.pageMessage} role="status">
          <span>{notice}</span>
        </div>
      ) : null}

      {editMode && canEditSheets ? (
        <InstallerAdvanceSheetForm
          mode="edit"
          installers={model.installers}
          sheet={sheet}
          submitting={saving}
          onSubmit={submitEdit}
          onCancel={() => setEditMode(false)}
        />
      ) : (
        <section className={styles.itemsCard} aria-label="Строки ведомости">
          <h2 className={styles.itemsTitle}>
            Авансы по договорам{' '}
            {sheet.questionCount > 0 ? (
              <span className={styles.questionCountSubline}>
                вопросов открыто: {sheet.questionCount}
              </span>
            ) : null}
          </h2>
          <div className={styles.itemsTableWrap}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th className={styles.colIndex}>№</th>
                  <th>Договор</th>
                  <th>Заказчик, адрес</th>
                  <th className={styles.colAmount}>Сумма</th>
                  <th className={styles.colStatus}>Статус</th>
                  <th className={styles.colActions}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sheet.items.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    canManagePayments={canManagePayments}
                    canComment={canComment}
                    commentsOpen={openCommentsItemId === item.id}
                    commentDraft={commentDrafts[item.id] ?? ''}
                    commentBusy={commentBusyItemId === item.id}
                    onToggleComments={() => toggleComments(item.id)}
                    onCommentDraft={(value) => setCommentDraft(item.id, value)}
                    onCommentSubmit={() => void submitComment(item.id)}
                    onPay={() => openPayModal({ kind: 'item', itemId: item.id })}
                    onUnpay={() => setUnpayTarget(item.id)}
                    onResolveQuestion={() => void resolveQuestion(item.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.detailNote}>
            Отметка «Выплачено» создаёт запись в журнале авансов договора — она же появляется в
            разделе «Расчёт мастеров». Выплаты отмечает только супер-админ.
          </p>
        </section>
      )}

      {payTarget ? (
        <Modal
          isOpen
          onClose={closePayModal}
          title={
            payTarget.kind === 'all'
              ? `Выплатить всю ведомость (${pendingCount})`
              : 'Отметить аванс выплаченным'
          }
          size="sm"
          showCloseButton
          compactOnMobile
        >
          <form
            data-modal-form
            onSubmit={(e) => {
              e.preventDefault();
              void submitPay();
            }}
          >
            <div data-modal-form-grid>
              <div data-modal-form-group>
                <label htmlFor="ias-pay-at">Дата выдачи *</label>
                <input
                  id="ias-pay-at"
                  type="date"
                  value={payAt}
                  onChange={(e) => setPayAt(e.target.value)}
                  disabled={paySubmitting}
                  required
                />
              </div>
              <div data-modal-form-group>
                <label htmlFor="ias-pay-method">Способ оплаты</label>
                <select
                  id="ias-pay-method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'BANK')}
                  disabled={paySubmitting}
                >
                  {Object.entries(payMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p data-modal-form-hint>
              Будет создана запись журнала авансов по договору — она же появится в разделе «Расчёт
              мастеров».
            </p>
            <div data-modal-form-actions>
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={closePayModal}
                disabled={paySubmitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                data-admin-mutation
                data-modal-btn="primary"
                disabled={paySubmitting || !payAt}
              >
                {paySubmitting ? 'Сохранение…' : 'Отметить выплаченным'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {unpayTarget ? (
        <ConfirmModal
          isOpen
          onClose={() => setUnpayTarget(null)}
          onConfirm={() => void submitUnpay()}
          title="Отмена выплаты"
          message="Запись уйдёт из журнала авансов и «Расчёта мастеров», строка снова будет ожидать выдачи. Продолжить?"
          confirmText="Отменить выплату"
          variant="danger"
          closeOnConfirm={false}
          confirmLoading={unpaySubmitting}
        />
      ) : null}

      {deleteOpen ? (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => void submitDelete()}
          title="Удалить ведомость"
          message={`Удалить ведомость № ${sheet.number}? Действие необратимо.`}
          confirmText="Удалить"
          variant="danger"
          closeOnConfirm={false}
          confirmLoading={deleteSubmitting}
        />
      ) : null}
    </div>
  );
}

function ItemRow({
  item,
  index,
  canManagePayments,
  canComment,
  commentsOpen,
  commentDraft,
  commentBusy,
  onToggleComments,
  onCommentDraft,
  onCommentSubmit,
  onPay,
  onUnpay,
  onResolveQuestion,
}: {
  item: InstallerAdvanceSheetItem;
  index: number;
  canManagePayments: boolean;
  canComment: boolean;
  commentsOpen: boolean;
  commentDraft: string;
  commentBusy: boolean;
  onToggleComments: () => void;
  onCommentDraft: (value: string) => void;
  onCommentSubmit: () => void;
  onPay: () => void;
  onUnpay: () => void;
  onResolveQuestion: () => void;
}) {
  return (
    <>
      <tr>
        <td>{index + 1}</td>
        <td>
          <strong>{item.contractNumber || '—'}</strong>
          <span className={isStyles.cellSubline}>
            {item.direction}
            {IAS_PACKAGE_STATUS_LABELS[item.packageStatus]
              ? ` · ${IAS_PACKAGE_STATUS_LABELS[item.packageStatus]}`
              : ''}
          </span>
        </td>
        <td>
          <div className={isStyles.customerCell}>
            {item.customerName || '—'}
            {item.objectAddress ? (
              <span className={isStyles.cellSubline}>{item.objectAddress}</span>
            ) : null}
          </div>
        </td>
        <td className="num">{formatIasMoney(item.amount)}</td>
        <td>
          <span
            className={`${styles.statusBadge} ${styles[`status_${itemStatusTone(item.status)}`]}`}
          >
            {IAS_ITEM_STATUS_LABELS[item.status]}
          </span>
          {item.status === 'PAID' ? (
            <span className={isStyles.cellSubline}>
              {formatIasDate(item.paidAt)} ·{' '}
              {formatInstallerAdvancePaymentMethod(item.paymentMethod)}
              {item.paidBy ? ` · ${item.paidBy.name}` : ''}
            </span>
          ) : null}
        </td>
        <td>
          <div className={styles.itemActions}>
            {canManagePayments && item.status !== 'PAID' ? (
              <button
                type="button"
                data-admin-mutation
                className={`${styles.itemActionBtn} ${styles.itemActionPrimary}`}
                onClick={onPay}
              >
                Выдать
              </button>
            ) : null}
            {canManagePayments && item.status === 'PAID' ? (
              <button
                type="button"
                data-admin-mutation
                className={`${styles.itemActionBtn} ${styles.itemActionDanger}`}
                onClick={onUnpay}
              >
                Отменить выплату
              </button>
            ) : null}
            {canManagePayments && item.status === 'QUESTION' ? (
              <button type="button" className={styles.itemActionBtn} onClick={onResolveQuestion}>
                Снять вопрос
              </button>
            ) : null}
            <button
              type="button"
              className={styles.itemActionBtn}
              onClick={onToggleComments}
              aria-expanded={commentsOpen}
            >
              💬 Переписка{item.comments.length > 0 ? ` (${item.comments.length})` : ''}
            </button>
          </div>
        </td>
      </tr>
      {commentsOpen ? (
        <tr>
          <td colSpan={6}>
            <div className={styles.commentsBlock}>
              {item.comments.length === 0 ? (
                <p className={styles.commentsEmpty}>
                  Сообщений пока нет. Супер-админ может задать вопрос по авансу, ведущий специалист
                  — ответить.
                </p>
              ) : (
                <div className={styles.commentsList}>
                  {item.comments.map((comment) => (
                    <div key={comment.id} className={styles.commentRow}>
                      <div className={styles.commentMeta}>
                        <span
                          className={`${styles.commentMetaStrong} ${
                            comment.author?.role === 'SUPER_ADMIN' ? styles.commentAuthorSuper : ''
                          }`}
                        >
                          {comment.author?.name ?? '—'}
                          {comment.author?.role === 'SUPER_ADMIN' ? ' (супер-админ)' : ''}
                        </span>{' '}
                        · {formatIasDateTime(comment.createdAt)}
                      </div>
                      <p className={styles.commentBody}>{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}
              {canComment ? (
                <div className={styles.commentForm}>
                  <textarea
                    value={commentDraft}
                    onChange={(e) => onCommentDraft(e.target.value)}
                    placeholder={
                      canManagePayments
                        ? 'Вопрос по авансу (переведёт строку в статус «Есть вопрос»)…'
                        : 'Ответ ведущего специалиста…'
                    }
                    disabled={commentBusy}
                    maxLength={2000}
                  />
                  <button
                    type="button"
                    data-admin-mutation
                    className={`${styles.itemActionBtn} ${styles.itemActionPrimary}`}
                    onClick={onCommentSubmit}
                    disabled={commentBusy || !commentDraft.trim()}
                  >
                    {commentBusy ? 'Отправка…' : 'Отправить'}
                  </button>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
