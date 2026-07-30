'use client';

import { Fragment, useEffect, useState } from 'react';

import Link from 'next/link';

import { formatApprovalCountdown, getApprovalRemainingMs } from '@/shared/api/user-orders';
import {
  AdminListRefreshButton,
  AdminToolbarIconButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { VersionsHistoryIcon } from '@/shared/ui/icons/VersionsHistoryIcon';
import {
  AdminStickyPageRoot,
  AdminStickySaveButtonSlot,
} from '@/views/admin/ui/AdminStickySaveButton';

import styles from './OrderDetailPage.module.css';
import { OrderDetailRulesInfoTip } from './OrderDetailRulesInfoTip';
import { OrderHistoryModal } from './OrderHistoryModal';
import type { OrderDetailPageModel } from './hooks/useOrderDetailPage';
import { ORDER_DETAIL_STATUS_OPTIONS } from './order-detail-page.constants';
import { formatDurationMinutesSeconds, formatOrderDetailPrice } from './order-detail-page.utils';

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
    saving,
    saveToastSuccess,
    setSaveToastSuccess,
    saveToastError,
    setSaveToastError,
    showOrderHistoryModal,
    setShowOrderHistoryModal,
    refreshing,
    commentDraftByItemId,
    setCommentDraftByItemId,
    orderServiceGroups,
    isManagerRole,
    isSuperAdmin,
    pageHeaderRef,
    saveButtonState,
    saveButtonPinnedTopPx,
    handleHeaderSaveClick,
    handleRefresh,
    handleStatusChange,
    handleSendBack,
    handleDeleteOrder,
    handleSendToEmail,
  } = model;

  const [compactChrome, setCompactChrome] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => setCompactChrome(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

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
    <AdminStickyPageRoot stickyTopPx={saveButtonPinnedTopPx} className={styles.page}>
      <div ref={pageHeaderRef} className={styles.headerChrome}>
        <Link href="/admin/orders" className={styles.headerBack}>
          ← К списку заказов
        </Link>

        <div className={styles.headerIcons}>
          <AdminToolbarIconButton
            type="button"
            onClick={() => setShowOrderHistoryModal(true)}
            title="История заказа"
            aria-label="История заказа"
          >
            <VersionsHistoryIcon size={18} />
          </AdminToolbarIconButton>
          <AdminListRefreshButton
            onClick={handleRefresh}
            disabled={refreshing || saving}
            busy={refreshing}
            title="Обновить данные заказа"
            aria-label={refreshing ? 'Обновление данных заказа' : 'Обновить данные заказа'}
          />
          {isSuperAdmin && (
            <AdminToolbarIconButton
              data-admin-mutation
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteSubmitting || saving}
              iconSpinning={deleteSubmitting}
              title="В корзину"
              aria-label={deleteSubmitting ? 'Перемещение в корзину…' : 'В корзину'}
              aria-busy={deleteSubmitting}
            >
              <DeleteIcon size={18} />
            </AdminToolbarIconButton>
          )}
        </div>

        <div className={styles.headerSave}>
          <AdminStickySaveButtonSlot
            state={saveButtonState}
            saving={saving}
            label={compactChrome ? 'Сохранить' : 'Сохранить изменения'}
            onClick={handleHeaderSaveClick}
          />
        </div>

        <div className={styles.titleRow}>
          <div className={styles.titleCluster}>
            <h1 className={styles.title}>Заказ {order.orderNumber}</h1>
            <OrderDetailRulesInfoTip />
          </div>
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
        </div>

        <div className={styles.currentStatus}>
          <span className={styles.currentStatusText}>
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
          </span>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deleteSubmitting && setDeleteConfirmOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>
              Переместить заказ <strong>{order.orderNumber}</strong> в корзину? Он исчезнет из
              списка, восстановить можно из корзины.
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
                data-admin-mutation
                type="button"
                className={styles.modalConfirmDelete}
                onClick={handleDeleteOrder}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Перемещение…' : 'В корзину'}
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

      <section className={`${styles.section} ${styles.sectionActions}`}>
        <h2 className={styles.sectionTitle}>Действия по заказу</h2>
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
              data-admin-mutation
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
              data-admin-mutation
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
      </section>

      <section className={`${styles.section} ${styles.sectionClient}`}>
        <h2 className={styles.sectionTitle}>Клиент</h2>
        <div className={styles.clientFields}>
          <div className={styles.deliveryCostEditRow}>
            <label className={styles.deliveryCostEditLabel}>
              Email
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={`${styles.deliveryCostInput} ${styles.clientFieldInput}`}
                placeholder="customer@example.com"
              />
            </label>
          </div>
          <div className={styles.deliveryCostEditRow}>
            <label className={styles.deliveryCostEditLabel}>
              Фамилия
              <input
                type="text"
                value={customerLastName}
                onChange={(e) => setCustomerLastName(e.target.value)}
                className={`${styles.deliveryCostInput} ${styles.clientFieldInput}`}
              />
            </label>
          </div>
          <div className={styles.deliveryCostEditRow}>
            <label className={styles.deliveryCostEditLabel}>
              Имя
              <input
                type="text"
                value={customerFirstName}
                onChange={(e) => setCustomerFirstName(e.target.value)}
                className={`${styles.deliveryCostInput} ${styles.clientFieldInput}`}
              />
            </label>
          </div>
          <div className={styles.deliveryCostEditRow}>
            <label className={styles.deliveryCostEditLabel}>
              Отчество
              <input
                type="text"
                value={customerMiddleName}
                onChange={(e) => setCustomerMiddleName(e.target.value)}
                className={`${styles.deliveryCostInput} ${styles.clientFieldInput}`}
              />
            </label>
          </div>
          <div className={styles.deliveryCostEditRow}>
            <label className={styles.deliveryCostEditLabel}>
              Телефон
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={`${styles.deliveryCostInput} ${styles.clientFieldInput}`}
                placeholder="+7 (___) ___-__-__"
              />
            </label>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionItems}`}>
        <h2 className={styles.sectionTitle}>Состав заказа</h2>

        <div className={styles.itemsMobile} aria-label="Состав заказа">
          {items.map((item) => {
            const price = Number(item.price);
            const lineTotal = price * item.quantity;
            return (
              <article key={item.id} className={styles.itemMobileCard}>
                <div className={styles.itemMobileName}>{item.product?.name ?? '—'}</div>
                {(item.size || item.openingSide || item.product?.sku) && (
                  <div className={styles.itemMobileMeta}>
                    {[item.product?.sku, item.size, item.openingSide].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div className={styles.itemMobileRows}>
                  <div className={styles.itemMobileRow}>
                    <span className={styles.itemMobileRowLabel}>Кол-во</span>
                    <span className={styles.itemMobileRowValue}>{item.quantity}</span>
                  </div>
                  <div className={styles.itemMobileRow}>
                    <span className={styles.itemMobileRowLabel}>Цена</span>
                    <span className={styles.itemMobileRowValue}>
                      {formatOrderDetailPrice(price)}
                    </span>
                  </div>
                  <div className={styles.itemMobileRow}>
                    <span className={styles.itemMobileRowLabel}>Сумма</span>
                    <span className={styles.itemMobileRowValue}>
                      {formatOrderDetailPrice(lineTotal)}
                    </span>
                  </div>
                </div>
                <div className={styles.commentBlock}>
                  <label className={styles.commentLabel} htmlFor={`comment-mobile-${item.id}`}>
                    Рекомендации для покупателя
                  </label>
                  <textarea
                    id={`comment-mobile-${item.id}`}
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
              </article>
            );
          })}
          {orderServiceGroups.map((group) => (
            <div key={group.categoryName}>
              <div className={styles.itemMobileGroup}>{group.categoryName}</div>
              {group.rooms.map((room) => (
                <div key={`${group.categoryName}-${room.roomName}`}>
                  <div className={styles.itemMobileRoom}>{room.roomName}</div>
                  {room.items.map((svc) => (
                    <article key={svc.id} className={styles.itemMobileCard}>
                      <div className={styles.itemMobileServiceName}>{svc.name}</div>
                      <div className={styles.itemMobileRows}>
                        <div className={styles.itemMobileRow}>
                          <span className={styles.itemMobileRowLabel}>Кол-во</span>
                          <span className={styles.itemMobileRowValue}>{svc.quantity}</span>
                        </div>
                        <div className={styles.itemMobileRow}>
                          <span className={styles.itemMobileRowLabel}>Цена</span>
                          <span className={styles.itemMobileRowValue}>
                            {formatOrderDetailPrice(svc.price)}
                          </span>
                        </div>
                        <div className={styles.itemMobileRow}>
                          <span className={styles.itemMobileRowLabel}>Сумма</span>
                          <span className={styles.itemMobileRowValue}>
                            {formatOrderDetailPrice(svc.amount)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={`${styles.itemsTableWrap} ${styles.itemsTableDesktop}`}>
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
                          </td>
                          <td className={styles.td}>—</td>
                          <td className={styles.td}>{svc.quantity}</td>
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
        </div>
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
                data-admin-mutation
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

      <OrderHistoryModal
        isOpen={showOrderHistoryModal}
        order={order}
        onClose={() => setShowOrderHistoryModal(false)}
      />

      {(order.shippingAddressId ||
        order.shippingAddress ||
        order.deliveryType ||
        order.shippingCost != null) && (
        <section className={`${styles.section} ${styles.sectionDelivery}`}>
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
                    className={
                      deliveryPlannedDate
                        ? `${styles.deliveryCostInput} ${styles.deliveryDateInputFilled}`
                        : styles.deliveryCostInput
                    }
                  />
                </label>
              </div>
            </div>
          )}
        </section>
      )}

      {order.returnedForCorrectionAt && (
        <section className={`${styles.section} ${styles.sectionCorrection}`}>
          <h2 className={styles.sectionTitle}>Последняя отправка на доработку</h2>
          <p className={styles.muted}>
            {new Date(order.returnedForCorrectionAt).toLocaleString('ru-RU')}
          </p>
          {order.returnedForCorrectionComment && (
            <p className={styles.correctionComment}>{order.returnedForCorrectionComment}</p>
          )}
        </section>
      )}

      {saveToastSuccess && (
        <div className={`${styles.toast} ${styles.toastSuccess}`} role="status">
          <span className={styles.toastIcon}>✓</span>
          <span className={styles.toastMessage}>{saveToastSuccess}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setSaveToastSuccess(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
      {saveToastError && (
        <div className={`${styles.toast} ${styles.toastError}`} role="alert">
          <span className={styles.toastIcon}>⚠</span>
          <span className={styles.toastMessage}>{saveToastError}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setSaveToastError(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </AdminStickyPageRoot>
  );
}
