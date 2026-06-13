'use client';

import { Fragment } from 'react';

import Link from 'next/link';

import { formatApprovalCountdown, getApprovalRemainingMs } from '@/shared/api/user-orders';

import styles from './OrderDetailPage.module.css';
import type { OrderDetailPageModel } from './hooks/useOrderDetailPage';
import { ORDER_DETAIL_STATUS_OPTIONS } from './order-detail-page.constants';
import {
  buildOrderHistory,
  formatDurationMinutesSeconds,
  formatEventDateTime,
  formatOrderDetailPrice,
} from './order-detail-page.utils';

type OrderDetailPageViewProps = {
  model: OrderDetailPageModel;
};

export function OrderDetailPageView({ model }: OrderDetailPageViewProps) {
  const {
    order,
    loading,
    error,
    statusUpdating,
    sendBackModalOpen,
    setSendBackModalOpen,
    sendBackComment,
    setSendBackComment,
    sendBackSubmitting,
    approvedNotice,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    deleteSubmitting,
    cancelOrderConfirmOpen,
    setCancelOrderConfirmOpen,
    sendToEmailInProgress,
    deliveryShippingCost,
    setDeliveryShippingCost,
    deliveryCarryCost,
    setDeliveryCarryCost,
    deliveryMoversCount,
    setDeliveryMoversCount,
    deliveryPlannedDate,
    setDeliveryPlannedDate,
    deliverySaving,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    customerFirstName,
    setCustomerFirstName,
    customerMiddleName,
    setCustomerMiddleName,
    customerLastName,
    setCustomerLastName,
    customerSaving,
    customerSaveSuccess,
    showOrderHistoryModal,
    setShowOrderHistoryModal,
    refreshing,
    commentDraftByItemId,
    setCommentDraftByItemId,
    orderServiceGroups,
    isManagerRole,
    isSuperAdmin,
    handleRefresh,
    handleStatusChange,
    handleSendBack,
    handleDeleteOrder,
    handleSendToEmail,
    handleSaveCustomer,
    handleSaveDelivery,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка заказа...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error ?? 'Заказ не найден'}</p>
        <Link href="/admin/orders" className={styles.backLink}>
          ← К списку заказов
        </Link>
      </div>
    );
  }

  const total = Number(order.total);
  const items = order.items ?? [];

  const canSendBack =
    order.status === 'PENDING_REVIEW' ||
    order.status === 'APPROVED' ||
    order.status === 'RETURNED_FOR_CORRECTION';

  const canSendToEmail =
    order.status === 'APPROVED' &&
    !order.sentToEmailAt &&
    (order.createdByManagerId ? order.customerEmail : order.user?.email || order.customerEmail);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/admin/orders" className={styles.backLink}>
            ← К списку заказов
          </Link>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Обновить данные заказа"
            >
              {refreshing ? 'Обновление…' : 'Обновить'}
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Удаление…' : 'Удалить заказ'}
              </button>
            )}
          </div>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Заказ {order.orderNumber}</h1>
          <span className={styles.managerInline}>
            {order.processedByManager ? (
              <>
                Менеджер: {order.processedByManager.firstName} {order.processedByManager.lastName}
                {order.processedByManager.email && <> · {order.processedByManager.email}</>}
              </>
            ) : (
              <span className={styles.mutedText}>Менеджер ещё не назначен</span>
            )}
          </span>
          <button
            type="button"
            className={styles.historyActionButton}
            onClick={() => setShowOrderHistoryModal(true)}
            title="История заказа"
            aria-label="История заказа"
          >
            📋 История
          </button>
        </div>
        <p className={styles.currentStatus}>
          Статус:{' '}
          <span className={`${styles.statusBadge} ${styles[`status${order.status}`] ?? ''}`}>
            {ORDER_DETAIL_STATUS_OPTIONS.find((o) => o.value === order.status)?.label ??
              order.status}
          </span>
          {order.status === 'PENDING_REVIEW' && order.submittedForReviewAt && (
            <>
              {' · '}
              <span className={styles.currentStatusHighlight}>
                {formatDurationMinutesSeconds(
                  Date.now() - new Date(order.submittedForReviewAt).getTime()
                )}
              </span>
            </>
          )}
        </p>
      </div>

      {deleteConfirmOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deleteSubmitting && setDeleteConfirmOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>
              Удалить заказ <strong>{order.orderNumber}</strong>? Это действие нельзя отменить.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.modalConfirmDelete}
                onClick={handleDeleteOrder}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOrderConfirmOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !statusUpdating && setCancelOrderConfirmOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>
              Отменить заказ <strong>{order.orderNumber}</strong>? Покупатель сможет оформить заказ
              заново из корзины.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setCancelOrderConfirmOpen(false)}
                disabled={statusUpdating}
              >
                Нет
              </button>
              <button
                type="button"
                className={styles.modalConfirmDelete}
                onClick={async () => {
                  await handleStatusChange('CANCELLED');
                  setCancelOrderConfirmOpen(false);
                }}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Отмена…' : 'Да, отменить заказ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.actionsRow}>
        {canSendBack &&
          (() => {
            const hasProductItems = (order.items ?? []).length > 0;
            const hasCommentsForProductItems = (order.items ?? []).some((item) => {
              const value = commentDraftByItemId[item.id] ?? item.managerComment ?? '';
              return typeof value === 'string' && value.trim().length > 0;
            });
            const sendBackDisabled =
              order.status === 'RETURNED_FOR_CORRECTION' ||
              (hasProductItems && !hasCommentsForProductItems);
            return (
              <button
                type="button"
                className={styles.sendBackButton}
                onClick={sendBackDisabled ? undefined : () => setSendBackModalOpen(true)}
                disabled={sendBackDisabled}
                title={
                  hasProductItems && !hasCommentsForProductItems
                    ? 'Сначала оставьте рекомендации для покупателя в составе заказа (комментарии к позициям)'
                    : undefined
                }
              >
                {order.status === 'RETURNED_FOR_CORRECTION'
                  ? 'Заказ на доработке'
                  : 'Отправить на доработку покупателю'}
              </button>
            );
          })()}
        {order.status === 'PENDING_REVIEW' && (
          <button
            type="button"
            className={styles.approveButton}
            onClick={() => handleStatusChange('APPROVED')}
            disabled={statusUpdating}
          >
            {statusUpdating ? 'Сохранение…' : 'Заказ проверен'}
          </button>
        )}
        {canSendToEmail && isManagerRole && (
          <button
            type="button"
            className={styles.approveButton}
            onClick={handleSendToEmail}
            disabled={sendToEmailInProgress}
            title="Отправить заказ на email покупателя для ознакомления и оплаты"
          >
            {sendToEmailInProgress ? 'Отправка…' : 'Отправить на email покупателя'}
          </button>
        )}
        {order.sentToEmailAt && (
          <span className={styles.sentToEmailBadge} role="status">
            Отправлено на email {new Date(order.sentToEmailAt).toLocaleString('ru-RU')}
          </span>
        )}
        {!['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(order.status) && (
          <button
            type="button"
            className={styles.cancelOrderButton}
            onClick={() => setCancelOrderConfirmOpen(true)}
            disabled={statusUpdating}
          >
            {statusUpdating ? '…' : 'Отменить заказ'}
          </button>
        )}
      </div>
      {statusUpdating && <span className={styles.saving}>Сохранение...</span>}
      {approvedNotice && (
        <p className={styles.approvedNotice} role="status">
          Покупатель может продолжить оформление заказа
        </p>
      )}
      {order.status === 'APPROVED' && order.approvedAt && (
        <p className={styles.approvalCountdown}>
          Осталось для оформления покупателем:{' '}
          <span className={styles.approvalCountdownTime}>
            {formatApprovalCountdown(
              getApprovalRemainingMs(order.approvedAt, order.approvalValidMinutes)
            )}
          </span>
        </p>
      )}

      <section className={`${styles.section} ${styles.clientSection}`}>
        <h2 className={styles.sectionTitle}>Клиент</h2>
        <div className={styles.clientRow}>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={styles.input}
              placeholder="customer@example.com"
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Фамилия</label>
            <input
              type="text"
              value={customerLastName}
              onChange={(e) => setCustomerLastName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Имя</label>
            <input
              type="text"
              value={customerFirstName}
              onChange={(e) => setCustomerFirstName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Отчество</label>
            <input
              type="text"
              value={customerMiddleName}
              onChange={(e) => setCustomerMiddleName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Телефон</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={styles.input}
              placeholder="+7 (___) ___-__-__"
            />
          </div>
          <div className={styles.clientActions}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSaveCustomer}
              disabled={customerSaving}
            >
              {customerSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
            {customerSaveSuccess && (
              <span className={styles.inlineSuccess} role="status">
                Сохранено
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Состав заказа</h2>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.th}>Товар / комментарий менеджера</th>
              <th className={styles.th}>Артикул</th>
              <th className={styles.th}>Кол-во</th>
              <th className={styles.th}>Цена</th>
              <th className={styles.th}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const price = Number(item.price);
              const lineTotal = price * item.quantity;
              return (
                <tr key={item.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.itemRow}`}>
                    <span className={styles.productName}>{item.product?.name ?? '—'}</span>
                    {(item.size || item.openingSide) && (
                      <span className={styles.itemMeta}>
                        {[item.size, item.openingSide].filter(Boolean).join(', ')}
                      </span>
                    )}
                    <div className={styles.itemActions}>
                      <div className={styles.commentBlock}>
                        <label className={styles.commentLabel} htmlFor={`comment-${item.id}`}>
                          Рекомендации для покупателя (замена, количество и т.п.):
                        </label>
                        <textarea
                          id={`comment-${item.id}`}
                          className={styles.commentInput}
                          value={commentDraftByItemId[item.id] ?? item.managerComment ?? ''}
                          onChange={(e) =>
                            setCommentDraftByItemId((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="Например: рекомендуем заменить на… или изменить количество на…"
                          rows={2}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>{item.product?.sku ?? '—'}</td>
                  <td className={styles.td}>{item.quantity}</td>
                  <td className={styles.td}>{formatOrderDetailPrice(price)}</td>
                  <td className={styles.td}>{formatOrderDetailPrice(lineTotal)}</td>
                </tr>
              );
            })}
            {orderServiceGroups.map((group) => (
              <Fragment key={group.categoryName}>
                <tr className={styles.serviceCategoryRow}>
                  <td className={styles.serviceCategoryCell} colSpan={5}>
                    {group.categoryName}
                  </td>
                </tr>
                {group.rooms.map((room) => (
                  <Fragment key={`${group.categoryName}-${room.roomName}`}>
                    <tr className={styles.serviceRoomRow}>
                      <td className={styles.serviceRoomCell} colSpan={5}>
                        {room.roomName}
                      </td>
                    </tr>
                    {room.items.map((svc) => (
                      <tr key={svc.id} className={styles.tr}>
                        <td className={`${styles.td} ${styles.itemRow}`}>
                          <span className={styles.productName}>{svc.name}</span>
                          <span className={styles.itemMeta}>{svc.unit}</span>
                        </td>
                        <td className={styles.td}>—</td>
                        <td className={styles.td}>
                          {svc.quantity} {svc.unit}
                        </td>
                        <td className={styles.td}>{formatOrderDetailPrice(svc.price)}</td>
                        <td className={styles.td}>{formatOrderDetailPrice(svc.amount)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className={styles.total}>Итого: {formatOrderDetailPrice(total)}</p>
      </section>

      {sendBackModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !sendBackSubmitting && setSendBackModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Отправить заказ на доработку</h3>
            <p className={`${styles.muted} ${styles.modalHint}`}>
              Покупатель получит уведомление и сможет внести правки. Укажите общий комментарий
              (опционально):
            </p>
            <textarea
              className={styles.modalTextarea}
              value={sendBackComment}
              onChange={(e) => setSendBackComment(e.target.value)}
              placeholder="Например: уточните, пожалуйста, размер двери и адрес доставки"
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setSendBackModalOpen(false)}
                disabled={sendBackSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.modalConfirm}
                onClick={handleSendBack}
                disabled={sendBackSubmitting}
              >
                {sendBackSubmitting ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderHistoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowOrderHistoryModal(false)}>
          <div className={styles.historyModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyModalHeader}>
              <h3 className={styles.historyModalTitle}>История заказа {order.orderNumber}</h3>
              <button
                type="button"
                className={styles.historyModalClose}
                onClick={() => setShowOrderHistoryModal(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className={styles.orderHistory}>
              {buildOrderHistory(order).length === 0 ? (
                <p className={styles.orderHistoryEmpty}>Нет событий</p>
              ) : (
                <>
                  <div className={styles.orderHistoryHeader}>
                    <span className={styles.orderHistoryTime}>Дата и время</span>
                    <span className={styles.orderHistoryLabel}>Событие</span>
                    <span className={styles.orderHistoryDuration}>Продолжительность</span>
                    <span className={styles.orderHistoryAuthor}>Автор</span>
                  </div>
                  <ul className={styles.orderHistoryList}>
                    {buildOrderHistory(order).map((event) => (
                      <li key={`${event.at}-${event.label}`} className={styles.orderHistoryItem}>
                        <span className={styles.orderHistoryTime}>
                          {formatEventDateTime(event.at)}
                        </span>
                        <span className={styles.orderHistoryLabel}>{event.label}</span>
                        <span className={styles.orderHistoryDuration}>{event.duration ?? '—'}</span>
                        <span className={styles.orderHistoryAuthor}>{event.author}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(order.shippingAddressId ||
        order.shippingAddress ||
        order.deliveryType ||
        order.shippingCost != null) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Доставка</h2>
          <div className={styles.deliveryCompact}>
            <div className={styles.deliveryCompactLeft}>
              {order.shippingAddress ? (
                <>
                  <p>
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    {order.shippingAddress.phone && ` · ${order.shippingAddress.phone}`}
                  </p>
                  <p className={styles.address}>
                    {order.shippingAddress.street}, {order.shippingAddress.city}
                    {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''},{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                </>
              ) : (
                <p className={styles.muted}>Адрес не указан</p>
              )}
              {(order.deliveryType || order.shippingCost != null) && (
                <div className={styles.deliveryDetails}>
                  {order.deliveryType && (
                    <p>
                      {order.deliveryType === 'TO_APARTMENT' ? 'До квартиры' : 'До подъезда'}
                      {order.deliveryType === 'TO_APARTMENT' &&
                        order.deliveryFloor != null &&
                        `, ${order.deliveryFloor} эт.`}
                      {order.deliveryHasElevator != null &&
                        `, лифт: ${order.deliveryHasElevator ? 'да' : 'нет'}`}
                    </p>
                  )}
                  {order.preferredDeliveryTime && <p>Удобно: {order.preferredDeliveryTime}</p>}
                  {order.moversCount != null && <p>Грузчиков: {order.moversCount}</p>}
                  {order.plannedDeliveryDate && (
                    <p>План: {new Date(order.plannedDeliveryDate).toLocaleDateString('ru-RU')}</p>
                  )}
                </div>
              )}
            </div>
            {(order.shippingCost != null || order.carryCost != null) && (
              <div className={styles.deliveryCompactRight}>
                <div className={styles.deliveryCostSummary}>
                  <p className={styles.deliveryCostSummaryTitle}>Стоимость доставки</p>
                  <p className={styles.deliveryCostSummaryLine}>
                    Доставка: {formatOrderDetailPrice(order.shippingCost ?? 0)}
                  </p>
                  {order.carryCost != null && Number(order.carryCost) > 0 && (
                    <p className={styles.deliveryCostSummaryLine}>
                      {order.moversCount != null && order.moversCount > 0
                        ? `${order.moversCount} грузч.: `
                        : 'Грузчики: '}
                      {formatOrderDetailPrice(order.carryCost)}
                    </p>
                  )}
                  <p className={styles.deliveryCostSummaryTotal}>
                    Итого:{' '}
                    {(
                      Number(order.shippingCost ?? 0) + Number(order.carryCost ?? 0)
                    ).toLocaleString('ru-RU')}{' '}
                    ₽
                  </p>
                </div>
              </div>
            )}
          </div>
          {(order.shippingAddressId ||
            order.shippingAddress ||
            order.deliveryType != null ||
            order.shippingCost != null) && (
            <div className={styles.deliveryCostEdit}>
              <p className={styles.deliveryCostEditTitle}>
                Редактирование стоимости и даты доставки
              </p>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Стоимость доставки, ₽
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={deliveryShippingCost}
                    onChange={(e) => setDeliveryShippingCost(e.target.value)}
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Стоимость грузчиков, ₽
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={deliveryCarryCost}
                    onChange={(e) => setDeliveryCarryCost(e.target.value)}
                    placeholder="0 или пусто"
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Количество грузчиков
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={deliveryMoversCount}
                    onChange={(e) => setDeliveryMoversCount(e.target.value)}
                    placeholder="0 или пусто"
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Планируемая дата доставки
                  <input
                    type="date"
                    value={deliveryPlannedDate}
                    onChange={(e) => setDeliveryPlannedDate(e.target.value)}
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <button
                type="button"
                className={styles.deliveryCostSaveBtn}
                disabled={deliverySaving}
                onClick={handleSaveDelivery}
              >
                {deliverySaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          )}
        </section>
      )}

      {order.returnedForCorrectionAt && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Последняя отправка на доработку</h2>
          <p className={styles.muted}>
            {new Date(order.returnedForCorrectionAt).toLocaleString('ru-RU')}
          </p>
          {order.returnedForCorrectionComment && (
            <p className={styles.correctionComment}>{order.returnedForCorrectionComment}</p>
          )}
        </section>
      )}
    </div>
  );
}
