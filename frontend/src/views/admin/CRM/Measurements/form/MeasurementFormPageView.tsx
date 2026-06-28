'use client';

import Link from 'next/link';

import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { VersionsHistoryIcon } from '@/shared/ui/icons/VersionsHistoryIcon';
import { CrmCustomerSearchPanel } from '@/views/admin/CRM/Customers';

import { MeasurementHistoryModal } from '../modals/MeasurementHistoryModal';
import { getResultTabLabel } from '../shared/measurementResultTabs';
import { MEASUREMENT_STATUS_OPTIONS as STATUS_OPTIONS } from '../shared/measurementStatuses';
import styles from './MeasurementFormPage.module.css';
import type { MeasurementFormPageModel } from './hooks/useMeasurementFormPage';
import {
  MAX_ROOMS_COUNT,
  MEASUREMENT_STATUS_ORDER_HINT,
  STATUS_SELECT_CLASS_BY_VALUE,
} from './measurement-form-page.constants';
import {
  formatMetric,
  isMeasurementResultTabFilled,
  isRoomFilled,
  parseNumber,
  resolveAutoQuantity,
} from './measurement-form-page.utils';

type MeasurementFormPageViewProps = {
  model: MeasurementFormPageModel;
};

export function MeasurementFormPageView({ model }: MeasurementFormPageViewProps) {
  const {
    measurementId,
    managerId,
    setManagerId,
    receptionDate,
    setReceptionDate,
    executionDate,
    setExecutionDate,
    surveyorId,
    setSurveyorId,
    directionRows,
    customerName,
    setCustomerName,
    customerAddress,
    setCustomerAddress,
    customerPhone,
    setCustomerPhone,
    customerId,
    setCustomerId,
    comments,
    setComments,
    status,
    setStatus,
    loading,
    saving,
    message,
    fieldErrors,
    directions,
    users,
    managerOptions,
    showHistory,
    setShowHistory,
    repairMeasurementData,
    workCategories,
    activeWorkCategoryByRoomId,
    setActiveWorkCategoryByRoomId,
    activeRoomId,
    setActiveRoomId,
    resultsSectionOpen,
    setResultsSectionOpen,
    savedResultTabs,
    activeResultTab,
    setActiveResultTab,
    clearFieldError,
    showMessage,
    applyCrmCustomerFromDetail,
    directionOptionsForRow,
    insertDirectionRowAfter,
    updateDirectionRow,
    removeDirectionRow,
    visibleResultTabs,
    orphanManagerLabel,
    surveyors,
    updateRoom,
    addRoom,
    removeRoom,
    copyRoomWithWorksOnly,
    handleSaveResultTab,
    handleUnsaveResultTab,
  } = model;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  const isActiveResultTabLocked = savedResultTabs.has(activeResultTab);
  const isAutosaveMessage =
    message?.type === 'success' && message.text === 'Сохранено автоматически';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/measurements" className={styles.backLink}>
          ← К списку замеров
        </Link>
        <div className={styles.titleRow}>
          <div className={styles.titleWithAutosave}>
            <h1 className={styles.title}>
              {measurementId ? 'Редактирование замера' : 'Новый замер'}
            </h1>
            <AdminSaveNotice visible={isAutosaveMessage} />
          </div>
          <div className={styles.titleControls}>
            <BadgeTooltip content={MEASUREMENT_STATUS_ORDER_HINT} side="left" wide>
              <label className={styles.statusInlineLabel}>
                <span className={styles.statusInlineText}>Статус</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`${styles.select} ${styles.statusInlineSelect} ${
                    styles[STATUS_SELECT_CLASS_BY_VALUE[status] ?? '']
                  }`}
                  aria-describedby="measurement-status-order-hint"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span id="measurement-status-order-hint" className={styles.visuallyHidden}>
                  {MEASUREMENT_STATUS_ORDER_HINT}
                </span>
              </label>
            </BadgeTooltip>
            {measurementId ? (
              <button
                type="button"
                className={styles.historyButton}
                onClick={() => setShowHistory(true)}
                title="Журнал событий замера"
                aria-label="Открыть журнал событий замера"
              >
                <VersionsHistoryIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {message && !isAutosaveMessage ? (
        <AdminFormMessage type={message.type}>{message.text}</AdminFormMessage>
      ) : null}

      <div className={styles.form}>
        <section className={styles.formBlockSection}>
          <h2 className={styles.formBlockTitle}>Бланк замера</h2>
          <div className={styles.blankSheet}>
            <div className={`${styles.grid} ${styles.blankMetaGrid}`}>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="managerId">
                  Менеджер <span className={styles.required}>*</span>
                </label>
                <select
                  id="managerId"
                  value={managerId}
                  onChange={(e) => {
                    setManagerId(e.target.value);
                    clearFieldError('managerId');
                  }}
                  className={`${styles.select} ${fieldErrors.managerId ? styles.inputError : ''}`}
                  required
                  aria-invalid={!!fieldErrors.managerId}
                  aria-describedby={fieldErrors.managerId ? 'managerId-error' : undefined}
                >
                  <option value="">— Выберите —</option>
                  {orphanManagerLabel ? (
                    <option value={managerId}>{orphanManagerLabel}</option>
                  ) : null}
                  {managerOptions.map((p) => (
                    <option key={p.crmUserId} value={p.crmUserId}>
                      {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
                    </option>
                  ))}
                </select>
                {fieldErrors.managerId && (
                  <span id="managerId-error" className={styles.fieldError} role="alert">
                    {fieldErrors.managerId}
                  </span>
                )}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="receptionDate">
                  Дата приёма <span className={styles.required}>*</span>
                </label>
                <input
                  id="receptionDate"
                  type="date"
                  value={receptionDate}
                  onChange={(e) => {
                    setReceptionDate(e.target.value);
                    clearFieldError('receptionDate');
                  }}
                  className={`${styles.input} ${fieldErrors.receptionDate ? styles.inputError : ''}`}
                  required
                  aria-invalid={!!fieldErrors.receptionDate}
                  aria-describedby={fieldErrors.receptionDate ? 'receptionDate-error' : undefined}
                />
                {fieldErrors.receptionDate && (
                  <span id="receptionDate-error" className={styles.fieldError} role="alert">
                    {fieldErrors.receptionDate}
                  </span>
                )}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="executionDate">
                  Дата выполнения
                </label>
                <input
                  id="executionDate"
                  type="date"
                  value={executionDate}
                  onChange={(e) => {
                    setExecutionDate(e.target.value);
                    clearFieldError('executionDate');
                  }}
                  className={`${styles.input} ${fieldErrors.executionDate ? styles.inputError : ''}`}
                  aria-invalid={!!fieldErrors.executionDate}
                  aria-describedby={fieldErrors.executionDate ? 'executionDate-error' : undefined}
                />
                {fieldErrors.executionDate && (
                  <span id="executionDate-error" className={styles.fieldError} role="alert">
                    {fieldErrors.executionDate}
                  </span>
                )}
              </div>

              <div className={styles.row}>
                <label className={styles.label}>Замерщик</label>
                <select
                  value={surveyorId}
                  onChange={(e) => setSurveyorId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">— Не назначен —</option>
                  {surveyors.length > 0
                    ? surveyors.map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                        </option>
                      ))
                    : users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            <div className={styles.blankCustomerLayout}>
              <div className={`${styles.row} ${styles.directionRowsBlock}`}>
                <label className={styles.label}>
                  Направление <span className={styles.required}>*</span>
                </label>
                <div className={styles.directionRows}>
                  {directionRows.map((directionRowId, rowIndex) => (
                    <div key={`direction-row-${rowIndex}`} className={styles.directionRow}>
                      <select
                        value={directionRowId}
                        onChange={(e) => {
                          updateDirectionRow(rowIndex, e.target.value);
                          if (rowIndex === 0 && e.target.value) clearFieldError('directionId');
                        }}
                        className={`${styles.select} ${
                          rowIndex === 0 && fieldErrors.directionId ? styles.inputError : ''
                        }`}
                        required={rowIndex === 0}
                        aria-label={
                          rowIndex === 0
                            ? 'Основное направление'
                            : `Дополнительное направление ${rowIndex}`
                        }
                        aria-invalid={rowIndex === 0 ? !!fieldErrors.directionId : undefined}
                        aria-describedby={
                          rowIndex === 0 && fieldErrors.directionId
                            ? 'directionId-error'
                            : undefined
                        }
                      >
                        <option value="">— Выберите —</option>
                        {directionOptionsForRow(rowIndex).map((direction) => (
                          <option key={direction.id} value={direction.id}>
                            {direction.name}
                          </option>
                        ))}
                      </select>
                      <button
                        data-admin-mutation
                        type="button"
                        className={styles.directionRowAdd}
                        onClick={() => insertDirectionRowAfter(rowIndex)}
                        disabled={directionRows.length >= Math.max(directions.length, 1)}
                        aria-label="Добавить направление"
                        title="Добавить направление"
                      >
                        +
                      </button>
                      {rowIndex > 0 ? (
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.directionRowRemove}
                          onClick={() => removeDirectionRow(rowIndex)}
                          aria-label="Удалить направление"
                          title="Удалить направление"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {fieldErrors.directionId ? (
                  <span id="directionId-error" className={styles.fieldError} role="alert">
                    {fieldErrors.directionId}
                  </span>
                ) : null}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="customerName">
                  ФИО заказчика <span className={styles.required}>*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  readOnly
                  className={`${styles.input} ${styles.inputReadonly} ${
                    fieldErrors.customerName ? styles.inputError : ''
                  }`}
                  placeholder="Выберите карточку в базе"
                  required
                  aria-invalid={!!fieldErrors.customerName}
                  aria-describedby={fieldErrors.customerName ? 'customerName-error' : undefined}
                />
                {fieldErrors.customerName && (
                  <span id="customerName-error" className={styles.fieldError} role="alert">
                    {fieldErrors.customerName}
                  </span>
                )}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="customerPhone">
                  Телефон заказчика <span className={styles.required}>*</span>
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  readOnly
                  className={`${styles.input} ${styles.inputReadonly} ${
                    fieldErrors.customerPhone ? styles.inputError : ''
                  }`}
                  placeholder="Из карточки заказчика"
                  required
                  aria-invalid={!!fieldErrors.customerPhone}
                  aria-describedby={fieldErrors.customerPhone ? 'customerPhone-error' : undefined}
                />
                {fieldErrors.customerPhone && (
                  <span id="customerPhone-error" className={styles.fieldError} role="alert">
                    {fieldErrors.customerPhone}
                  </span>
                )}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="customerAddress">
                  Адрес объекта <span className={styles.required}>*</span>
                </label>
                <input
                  id="customerAddress"
                  type="text"
                  value={customerAddress}
                  readOnly
                  className={`${styles.input} ${styles.inputReadonly} ${
                    fieldErrors.customerAddress ? styles.inputError : ''
                  }`}
                  placeholder="Из карточки заказчика"
                  required
                  aria-invalid={!!fieldErrors.customerAddress}
                  aria-describedby={
                    fieldErrors.customerAddress ? 'customerAddress-error' : undefined
                  }
                />
                {fieldErrors.customerAddress ? (
                  <span id="customerAddress-error" className={styles.fieldError} role="alert">
                    {fieldErrors.customerAddress}
                  </span>
                ) : null}
              </div>

              <div className={styles.customerCrmPanelSlot}>
                <CrmCustomerSearchPanel
                  customerId={customerId}
                  onCustomerApplied={applyCrmCustomerFromDetail}
                  onClear={() => {
                    setCustomerId(null);
                    setCustomerName('');
                    setCustomerPhone('');
                    setCustomerAddress('');
                  }}
                  onError={(text) => showMessage('error', text)}
                  addCustomerDraft={{
                    fullName: customerName,
                    phone: customerPhone,
                    objectAddress: customerAddress,
                  }}
                />
              </div>
            </div>

            <div className={`${styles.row} ${styles.blankCommentRow}`}>
              <label className={styles.label}>Комментарии</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className={styles.textarea}
                rows={2}
                placeholder="Дополнительная информация..."
              />
            </div>
          </div>
        </section>

        <section className={styles.measurementsSection}>
          {!resultsSectionOpen ? (
            <div className={styles.measurementsCollapsed}>
              <button
                type="button"
                className={styles.openMeasurementResultsButton}
                onClick={() => {
                  setResultsSectionOpen(true);
                  setActiveResultTab(visibleResultTabs[0]?.id ?? 'repair');
                }}
              >
                Заполнить результаты замеров
              </button>
            </div>
          ) : (
            <>
              <div className={styles.measurementsSectionHeader}>
                <h2 className={styles.measurementsTitle}>Результаты замера</h2>
                <div className={styles.measurementsHeaderActions}>
                  {visibleResultTabs.length === 0 ? null : isActiveResultTabLocked ? (
                    <>
                      <span className={styles.measurementSavedBadge}>Замер сохранен</span>
                      <button
                        type="button"
                        className={`${styles.secondaryButton} ${styles.unsaveMeasurementButton}`}
                        onClick={() => void handleUnsaveResultTab(activeResultTab)}
                        disabled={saving}
                      >
                        Отменить сохранение замера
                      </button>
                    </>
                  ) : (
                    <button
                      data-admin-mutation
                      type="button"
                      className={`${styles.secondaryButton} ${styles.completeMeasurementButton}`}
                      onClick={() => void handleSaveResultTab(activeResultTab)}
                      disabled={saving}
                    >
                      Сохранить замер
                    </button>
                  )}
                </div>
              </div>
              <div
                className={styles.resultCategoryTabs}
                role="tablist"
                aria-label="Категории результатов замера"
              >
                {visibleResultTabs.length === 0 ? (
                  <p className={styles.measurementsHint}>
                    Выберите направление в блоке «Бланк замера» — здесь появятся вкладки результатов
                    замера.
                  </p>
                ) : null}
                {visibleResultTabs.map((tab) => {
                  const isActive = activeResultTab === tab.id;
                  const isFilled = isMeasurementResultTabFilled(
                    tab.id,
                    repairMeasurementData.rooms
                  );
                  const isSaved = savedResultTabs.has(tab.id);
                  return (
                    <button
                      key={tab.directionId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`${styles.resultCategoryTab} ${
                        isActive ? styles.resultCategoryTabActive : ''
                      } ${!isActive && isFilled ? styles.resultCategoryTabFilled : ''} ${
                        isActive && isFilled ? styles.resultCategoryTabActiveFilled : ''
                      } ${isActive && !isFilled ? styles.resultCategoryTabActiveEmpty : ''} ${
                        isSaved ? styles.resultCategoryTabSaved : ''
                      }`}
                      onClick={() => setActiveResultTab(tab.id)}
                    >
                      <span className={styles.resultCategoryTabLabel}>
                        {tab.label}
                        {isSaved ? (
                          <span
                            className={styles.resultCategoryTabSavedMark}
                            aria-label="Замер сохранен"
                          >
                            ✓
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              {visibleResultTabs.length > 0 && isActiveResultTabLocked ? (
                <p className={styles.measurementsLockedHint} role="status">
                  Раздел «{getResultTabLabel(activeResultTab, visibleResultTabs)}» сохранён и закрыт
                  для редактирования. Чтобы изменить данные, нажмите «Отменить сохранение замера».
                </p>
              ) : null}
              {visibleResultTabs.length > 0 && activeResultTab === 'repair' ? (
                <>
                  <p className={styles.measurementsHint}>
                    Помещений: {repairMeasurementData.rooms.length} / {MAX_ROOMS_COUNT}. Периметр,
                    площадь стен и вычеты дверей/окон считаются автоматически.
                  </p>

                  <div className={styles.roomTabsRow} role="tablist" aria-label="Помещения">
                    {repairMeasurementData.rooms.map((room, roomIndex) => {
                      const isActive = activeRoomId === room.id;
                      const isFilled = isRoomFilled(room);
                      return (
                        <button
                          key={`tab-${room.id}`}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={`${styles.roomTabButton} ${
                            isActive ? styles.roomTabButtonActive : ''
                          } ${!isActive && isFilled ? styles.roomTabButtonFilled : ''} ${
                            isActive && isFilled ? styles.roomTabButtonActiveFilled : ''
                          } ${isActive && !isFilled ? styles.roomTabButtonActiveEmpty : ''}`}
                          onClick={() => setActiveRoomId(room.id)}
                        >
                          {room.name.trim() || `Помещение ${roomIndex + 1}`}
                        </button>
                      );
                    })}
                    <button
                      data-admin-mutation
                      type="button"
                      className={`${styles.secondaryButton} ${styles.roomTabsAddButton}`}
                      onClick={addRoom}
                      disabled={
                        isActiveResultTabLocked ||
                        repairMeasurementData.rooms.length >= MAX_ROOMS_COUNT
                      }
                    >
                      + Добавить помещение
                    </button>
                  </div>

                  <fieldset
                    className={styles.measurementsTabBody}
                    disabled={isActiveResultTabLocked}
                  >
                    {(repairMeasurementData.rooms.filter((room) => room.id === activeRoomId)[0] ??
                      repairMeasurementData.rooms[0]) &&
                      (() => {
                        const room =
                          repairMeasurementData.rooms.filter((x) => x.id === activeRoomId)[0] ??
                          repairMeasurementData.rooms[0];
                        const roomIndex = repairMeasurementData.rooms.findIndex(
                          (x) => x.id === room.id
                        );
                        const wallSegments = room.wallSegments.map(parseNumber);
                        const perimeter = wallSegments.reduce((sum, value) => sum + value, 0);
                        const ceilingHeight = parseNumber(room.ceilingHeight);
                        const doorsArea = room.doors.reduce(
                          (sum, door) => sum + parseNumber(door.width) * parseNumber(door.height),
                          0
                        );
                        const windowsArea = room.windows.reduce(
                          (sum, window) =>
                            sum + parseNumber(window.width) * parseNumber(window.height),
                          0
                        );
                        const grossWallArea = perimeter * ceilingHeight;
                        const netWallArea = Math.max(0, grossWallArea - doorsArea - windowsArea);
                        const doorsWidthSum = room.doors.reduce(
                          (sum, door) => sum + parseNumber(door.width),
                          0
                        );
                        const baseboardPerimeter = Math.max(0, perimeter - doorsWidthSum);

                        return (
                          <article key={room.id} className={styles.roomCard}>
                            <div className={styles.roomCardHeader}>
                              <strong>Помещение {roomIndex + 1}</strong>
                              <div className={styles.roomActions}>
                                <AdminTableIconButton
                                  onClick={() => copyRoomWithWorksOnly(room.id)}
                                  disabled={repairMeasurementData.rooms.length >= MAX_ROOMS_COUNT}
                                  title="Скопировать помещение (только виды работ)"
                                  aria-label="Скопировать помещение"
                                >
                                  <CopyIcon />
                                </AdminTableIconButton>
                                {repairMeasurementData.rooms.length > 1 && (
                                  <AdminTableIconButton
                                    onClick={() => removeRoom(room.id)}
                                    disabled={isRoomFilled(room)}
                                    title={
                                      isRoomFilled(room)
                                        ? 'Заполненное помещение нельзя удалить'
                                        : 'Удалить помещение'
                                    }
                                    aria-label="Удалить помещение"
                                  >
                                    <DeleteIcon />
                                  </AdminTableIconButton>
                                )}
                              </div>
                            </div>

                            <div className={`${styles.roomTopGrid} ${styles.zonePrimary}`}>
                              <div className={styles.row}>
                                <label className={styles.label}>Название помещения</label>
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={room.name}
                                  onChange={(e) =>
                                    updateRoom(room.id, (r) => ({ ...r, name: e.target.value }))
                                  }
                                  placeholder="Кухня, Спальня, Коридор..."
                                />
                              </div>
                              <div className={styles.row}>
                                <label className={styles.label}>Высота потолка, м</label>
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={room.ceilingHeight}
                                  onChange={(e) =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      ceilingHeight: e.target.value,
                                    }))
                                  }
                                  placeholder="2.7"
                                />
                              </div>
                              <div className={styles.row}>
                                <label className={styles.label}>Площадь пола, м2</label>
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={room.floorArea}
                                  onChange={(e) =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      floorArea: e.target.value,
                                    }))
                                  }
                                  placeholder="18.5"
                                />
                              </div>
                              <div className={styles.row}>
                                <label className={styles.label}>Толщина стен, м</label>
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={room.wallThickness}
                                  onChange={(e) =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      wallThickness: e.target.value,
                                    }))
                                  }
                                  placeholder="0.2"
                                />
                              </div>
                              <div className={styles.row}>
                                <label className={styles.label}>Толщина откосов, м</label>
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={room.slopeThickness}
                                  onChange={(e) =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      slopeThickness: e.target.value,
                                    }))
                                  }
                                  placeholder="0.03"
                                />
                              </div>
                            </div>

                            <div
                              className={`${styles.row} ${styles.wallSegmentsSection} ${styles.zoneGeometry}`}
                            >
                              <label className={styles.label}>Участки стен (длины, м)</label>
                              <div className={styles.wallSegmentsList}>
                                {room.wallSegments.map((segment, segmentIndex) => (
                                  <div
                                    key={`${room.id}-segment-${segmentIndex}`}
                                    className={styles.wallSegmentItem}
                                  >
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={segment}
                                      onChange={(e) =>
                                        updateRoom(room.id, (r) => {
                                          const next = [...r.wallSegments];
                                          next[segmentIndex] = e.target.value;
                                          return { ...r, wallSegments: next };
                                        })
                                      }
                                      placeholder={`Сторона ${segmentIndex + 1}`}
                                    />
                                    <button
                                      type="button"
                                      className={styles.secondaryButton}
                                      onClick={() =>
                                        updateRoom(room.id, (r) => ({
                                          ...r,
                                          wallSegments: r.wallSegments.filter(
                                            (_, i) => i !== segmentIndex
                                          ),
                                        }))
                                      }
                                      disabled={room.wallSegments.length <= 1}
                                    >
                                      −
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  onClick={() =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      wallSegments: [...r.wallSegments, ''],
                                    }))
                                  }
                                >
                                  + Сторона
                                </button>
                              </div>
                            </div>

                            <div className={`${styles.roomOpeningsGrid} ${styles.zoneOpenings}`}>
                              <div className={styles.row}>
                                <label className={styles.label}>Двери (ширина x высота, м)</label>
                                {room.doors.map((door, doorIndex) => (
                                  <div
                                    key={door.id}
                                    className={`${styles.inlineRow} ${styles.openingSizeRow}`}
                                  >
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={door.width}
                                      onChange={(e) =>
                                        updateRoom(room.id, (r) => {
                                          const next = [...r.doors];
                                          next[doorIndex] = {
                                            ...next[doorIndex],
                                            width: e.target.value,
                                          };
                                          return { ...r, doors: next };
                                        })
                                      }
                                      placeholder="Ширина"
                                    />
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={door.height}
                                      onChange={(e) =>
                                        updateRoom(room.id, (r) => {
                                          const next = [...r.doors];
                                          next[doorIndex] = {
                                            ...next[doorIndex],
                                            height: e.target.value,
                                          };
                                          return { ...r, doors: next };
                                        })
                                      }
                                      placeholder="Высота"
                                    />
                                    <button
                                      type="button"
                                      className={styles.secondaryButton}
                                      onClick={() =>
                                        updateRoom(room.id, (r) => ({
                                          ...r,
                                          doors: r.doors.filter((_, i) => i !== doorIndex),
                                        }))
                                      }
                                    >
                                      −
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  onClick={() =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      doors: [
                                        ...r.doors,
                                        { id: `${r.id}-door-${Date.now()}`, width: '', height: '' },
                                      ],
                                    }))
                                  }
                                >
                                  + Добавить дверь
                                </button>
                              </div>

                              <div className={styles.row}>
                                <label className={styles.label}>Окна (ширина x высота, м)</label>
                                {room.windows.map((window, windowIndex) => (
                                  <div
                                    key={window.id}
                                    className={`${styles.inlineRow} ${styles.openingSizeRow}`}
                                  >
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={window.width}
                                      onChange={(e) =>
                                        updateRoom(room.id, (r) => {
                                          const next = [...r.windows];
                                          next[windowIndex] = {
                                            ...next[windowIndex],
                                            width: e.target.value,
                                          };
                                          return { ...r, windows: next };
                                        })
                                      }
                                      placeholder="Ширина"
                                    />
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={window.height}
                                      onChange={(e) =>
                                        updateRoom(room.id, (r) => {
                                          const next = [...r.windows];
                                          next[windowIndex] = {
                                            ...next[windowIndex],
                                            height: e.target.value,
                                          };
                                          return { ...r, windows: next };
                                        })
                                      }
                                      placeholder="Высота"
                                    />
                                    <button
                                      type="button"
                                      className={styles.secondaryButton}
                                      onClick={() =>
                                        updateRoom(room.id, (r) => ({
                                          ...r,
                                          windows: r.windows.filter((_, i) => i !== windowIndex),
                                        }))
                                      }
                                    >
                                      −
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  onClick={() =>
                                    updateRoom(room.id, (r) => ({
                                      ...r,
                                      windows: [
                                        ...r.windows,
                                        {
                                          id: `${r.id}-window-${Date.now()}`,
                                          width: '',
                                          height: '',
                                        },
                                      ],
                                    }))
                                  }
                                >
                                  + Добавить окно
                                </button>
                              </div>
                            </div>

                            <div className={styles.calculatedBlock}>
                              <div>
                                Периметр: <strong>{formatMetric(perimeter)} м</strong>
                              </div>
                              <div>
                                Периметр для плинтуса (минус двери):{' '}
                                <strong>{formatMetric(baseboardPerimeter)} м</strong>
                              </div>
                              <div>
                                Площадь стен (грязная):{' '}
                                <strong>{formatMetric(grossWallArea)} м2</strong>
                              </div>
                              <div>
                                Площадь дверей: <strong>{formatMetric(doorsArea)} м2</strong>
                              </div>
                              <div>
                                Площадь окон: <strong>{formatMetric(windowsArea)} м2</strong>
                              </div>
                              <div>
                                Площадь стен (чистая):{' '}
                                <strong>{formatMetric(netWallArea)} м2</strong>
                              </div>
                            </div>

                            <div className={styles.row}>
                              <label className={`${styles.label} ${styles.emphasisLabel}`}>
                                Требуемые виды работ
                              </label>
                              {workCategories.length === 0 ? (
                                <span className={styles.measurementsHint}>
                                  Список работ пока не загрузился.
                                </span>
                              ) : (
                                <>
                                  <div className={styles.workCategoryButtons}>
                                    {workCategories.map((category, categoryIndex) => {
                                      const activeCategoryId =
                                        activeWorkCategoryByRoomId[room.id] ??
                                        workCategories[0]?.id ??
                                        '';
                                      const isActive = activeCategoryId === category.id;
                                      const hasSelectedInCategory = category.items.some((item) =>
                                        room.selectedWorkItemIds.includes(item.id)
                                      );
                                      return (
                                        <button
                                          key={`${room.id}-${category.id}`}
                                          type="button"
                                          className={`${styles.workCategoryButton} ${
                                            isActive ? styles.workCategoryButtonActive : ''
                                          } ${hasSelectedInCategory ? styles.workCategoryButtonMarked : ''}`}
                                          title={
                                            hasSelectedInCategory
                                              ? 'В категории есть выбранные работы'
                                              : undefined
                                          }
                                          onClick={() =>
                                            setActiveWorkCategoryByRoomId((prev) => ({
                                              ...prev,
                                              [room.id]: category.id,
                                            }))
                                          }
                                        >
                                          {category.name || `Категория ${categoryIndex + 1}`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className={styles.workItemsGrid}>
                                    {(
                                      workCategories.find(
                                        (category) =>
                                          category.id ===
                                          (activeWorkCategoryByRoomId[room.id] ??
                                            workCategories[0]?.id)
                                      ) ?? workCategories[0]
                                    )?.items.map((item) => {
                                      const checked = room.selectedWorkItemIds.includes(item.id);
                                      const autoQty = resolveAutoQuantity(item.name, {
                                        floorArea: parseNumber(room.floorArea),
                                        perimeter,
                                        baseboardPerimeter,
                                        grossWallArea,
                                        netWallArea,
                                        doorsArea,
                                        windowsArea,
                                      });
                                      const manualQty = room.workItemQuantities[item.id] ?? '';
                                      const displayQty =
                                        manualQty.trim() !== ''
                                          ? manualQty
                                          : autoQty !== null
                                            ? formatMetric(autoQty)
                                            : '';
                                      return (
                                        <label
                                          key={`${room.id}-${item.id}`}
                                          className={styles.checkboxLabel}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) =>
                                              updateRoom(room.id, (r) => ({
                                                ...r,
                                                selectedWorkItemIds: e.target.checked
                                                  ? [...r.selectedWorkItemIds, item.id]
                                                  : r.selectedWorkItemIds.filter(
                                                      (id) => id !== item.id
                                                    ),
                                                workItemQuantities: e.target.checked
                                                  ? r.workItemQuantities
                                                  : Object.fromEntries(
                                                      Object.entries(r.workItemQuantities).filter(
                                                        ([key]) => key !== item.id
                                                      )
                                                    ),
                                              }))
                                            }
                                          />
                                          <span>{item.name}</span>
                                          {checked && (
                                            <span className={styles.itemQuantityWrap}>
                                              <input
                                                type="text"
                                                className={`${styles.input} ${styles.itemQuantityInput}`}
                                                value={displayQty}
                                                onChange={(e) =>
                                                  updateRoom(room.id, (r) => ({
                                                    ...r,
                                                    workItemQuantities: {
                                                      ...r.workItemQuantities,
                                                      [item.id]: e.target.value,
                                                    },
                                                  }))
                                                }
                                                placeholder={
                                                  autoQty !== null
                                                    ? formatMetric(autoQty)
                                                    : 'Кол-во'
                                                }
                                              />
                                              {autoQty !== null && manualQty.trim() !== '' && (
                                                <button
                                                  type="button"
                                                  className={styles.secondaryButton}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    updateRoom(room.id, (r) => ({
                                                      ...r,
                                                      workItemQuantities: Object.fromEntries(
                                                        Object.entries(r.workItemQuantities).filter(
                                                          ([key]) => key !== item.id
                                                        )
                                                      ),
                                                    }));
                                                  }}
                                                  title="Вернуть авторасчёт"
                                                >
                                                  ↺
                                                </button>
                                              )}
                                            </span>
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>

                            <div className={`${styles.row} ${styles.zoneNotes}`}>
                              <label className={`${styles.label} ${styles.emphasisLabel}`}>
                                Примечания по помещению
                              </label>
                              <textarea
                                value={room.notes}
                                onChange={(e) =>
                                  updateRoom(room.id, (r) => ({ ...r, notes: e.target.value }))
                                }
                                className={styles.textarea}
                                rows={2}
                                placeholder="Например: сложная геометрия, дополнительные подготовительные работы..."
                              />
                            </div>
                          </article>
                        );
                      })()}
                  </fieldset>
                </>
              ) : visibleResultTabs.length > 0 ? (
                <fieldset className={styles.measurementsTabBody} disabled={isActiveResultTabLocked}>
                  <p className={styles.measurementsTabPlaceholder}>
                    Раздел «{getResultTabLabel(activeResultTab, visibleResultTabs)}» будет доступен
                    позже.
                  </p>
                </fieldset>
              ) : null}
            </>
          )}
        </section>
      </div>

      {measurementId && showHistory && (
        <MeasurementHistoryModal
          measurementId={measurementId}
          measurementName={customerName || undefined}
          users={users}
          directions={directions}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
