'use client';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusCircleIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

import Link from 'next/link';

import { getSafeHref } from '@/shared/lib/sanitize';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { ESTIMATE_CUSTOM_WORK_UNITS } from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateCustomWorkItems';

import styles from './ServiceCategoryPage.module.css';
import type { ServiceCategoryPageModel } from './hooks/useServiceCategoryPage';
import {
  countSelectedInSectionForLines,
  formatPrice,
  workGroupKey,
} from './service-category-page.utils';

type ServiceCategoryPageViewProps = {
  model: ServiceCategoryPageModel;
};

export function ServiceCategoryPageView({ model }: ServiceCategoryPageViewProps) {
  const {
    hideAddToCart,
    hideBreadcrumbs,
    hideTitleBlock,
    allowCustomWorkItems,
    data,
    showCategoryLoading,
    calculations,
    activeCalcId,
    setActiveCalcId,
    addToCartLoading,
    addToCartError,
    lastAddedTotal,
    detachConfirmOpen,
    setDetachConfirmOpen,
    pendingReviewConfirmOpen,
    setPendingReviewConfirmOpen,
    collapsedWorkGroupKeys,
    customWorkName,
    setCustomWorkName,
    customWorkUnit,
    setCustomWorkUnit,
    customWorkPrice,
    setCustomWorkPrice,
    customWorkError,
    setCustomWorkError,
    detachResolverRef,
    pendingReviewResolverRef,
    addToCalculator,
    updateQuantity,
    removeFromCalculator,
    addCustomWorkToCalculator,
    addCalculation,
    removeCalculation,
    updateCalcName,
    toggleCollapsed,
    handleAddToCart,
    showPrices,
    activeCalcLines,
    tableSections,
    tableColCount,
    toggleWorkGroupCollapsed,
    totalAllRooms,
    hasAnyCalcLines,
    isInCart,
  } = model;

  if (showCategoryLoading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Категория не найдена</h1>
        <Link href="/catalog/services" className={styles.backLink}>
          ← Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {!hideBreadcrumbs ? (
        <nav className={styles.breadcrumb}>
          <Link href="/catalog/services">Ремонт квартир</Link>
          <span className={styles.breadcrumbSep}>/</span>
          {data.parent && (
            <>
              <Link href={getSafeHref(`/catalog/services/${data.parent.slug}`)}>
                {data.parent.name}
              </Link>
              <span className={styles.breadcrumbSep}>/</span>
            </>
          )}
          <span>{data.name}</span>
        </nav>
      ) : null}

      {!hideTitleBlock ? (
        <>
          <h1 className={styles.title}>{data.name}</h1>
          {data.description && <p className={styles.description}>{data.description}</p>}
        </>
      ) : null}

      <div className={styles.content}>
        <section className={styles.itemsSection} aria-label="Виды работ">
          {tableSections.length === 0 ? (
            <p className={styles.emptyItemsHint}>В этой категории пока нет позиций.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Название</th>
                    {showPrices && (
                      <>
                        <th>Цена за ед.</th>
                        <th>Ед. изм.</th>
                        <th></th>
                      </>
                    )}
                  </tr>
                </thead>
                {tableSections.map((section, sectionIdx) => {
                  const gKey = workGroupKey(section, sectionIdx);
                  const groupDomId = `wg-${data.id}-${sectionIdx}`;
                  const groupCollapsed =
                    section.items.length > 0 && collapsedWorkGroupKeys.has(gKey);
                  const selectedInStage =
                    showPrices && section.items.length > 0
                      ? countSelectedInSectionForLines(section, activeCalcLines)
                      : 0;
                  return (
                    <tbody key={gKey} id={groupDomId} className={styles.tableGroupTbody}>
                      <tr className={styles.tableGroupRow}>
                        <td colSpan={tableColCount}>
                          <div className={styles.tableGroupHeaderInner}>
                            {section.items.length > 0 ? (
                              <button
                                type="button"
                                className={styles.tableGroupToggle}
                                onClick={() => toggleWorkGroupCollapsed(section, sectionIdx)}
                                aria-expanded={!groupCollapsed}
                                aria-controls={groupDomId}
                                title={groupCollapsed ? 'Развернуть группу' : 'Свернуть группу'}
                                aria-label={
                                  groupCollapsed
                                    ? `Развернуть виды работ: Этап ${sectionIdx + 1}, ${section.name}`
                                    : `Свернуть виды работ: Этап ${sectionIdx + 1}, ${section.name}`
                                }
                              >
                                <ChevronDownIcon
                                  className={`${styles.tableGroupToggleIcon} ${groupCollapsed ? styles.tableGroupToggleIconCollapsed : ''}`}
                                  aria-hidden
                                />
                              </button>
                            ) : null}
                            <span className={styles.tableGroupStageLabel}>
                              Этап {sectionIdx + 1}
                            </span>
                            <span className={styles.tableGroupTitle}>{section.name}</span>
                            {selectedInStage > 0 ? (
                              <span
                                className={styles.tableGroupSelectedCount}
                                title={`В расчёте активного помещения: ${selectedInStage}`}
                                aria-label={`Выбрано позиций этого этапа в расчёте: ${selectedInStage}`}
                              >
                                {selectedInStage}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {!groupCollapsed &&
                        section.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            {showPrices && (
                              <>
                                <td>{item.price !== undefined ? formatPrice(item.price) : '—'}</td>
                                <td>{item.unit}</td>
                                <td className={styles.tableActionCell}>
                                  {item.price !== undefined &&
                                    (() => {
                                      const isInCalc = activeCalcLines.some(
                                        (l) => l.itemId === item.id
                                      );
                                      return (
                                        <button
                                          type="button"
                                          className={`${styles.addButton} ${isInCalc ? styles.addButtonSelected : ''}`}
                                          onClick={() => void addToCalculator(item)}
                                          title={
                                            isInCalc
                                              ? 'В расчёте (нажмите, чтобы добавить ещё)'
                                              : 'В расчёт'
                                          }
                                        >
                                          {isInCalc ? (
                                            <CheckCircleIconSolid
                                              className={styles.addButtonIcon}
                                            />
                                          ) : (
                                            <PlusCircleIcon className={styles.addButtonIcon} />
                                          )}
                                        </button>
                                      );
                                    })()}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
          {allowCustomWorkItems && showPrices ? (
            <div className={styles.customWorkSection}>
              <h3 className={styles.customWorkTitle}>Дополнительные виды работ</h3>
              <p className={styles.customWorkHint}>
                Только для этого расчёта: позиции не попадают в общий каталог и сохраняются вместе с
                расчётом.
              </p>
              <div className={styles.customWorkForm}>
                <label className={styles.customWorkField}>
                  <span>Название</span>
                  <input
                    type="text"
                    value={customWorkName}
                    onChange={(e) => {
                      setCustomWorkName(e.target.value);
                      if (customWorkError) setCustomWorkError(null);
                    }}
                    placeholder="Например: Монтаж нестандартной конструкции"
                    maxLength={200}
                  />
                </label>
                <label className={styles.customWorkField}>
                  <span>Ед. изм.</span>
                  <select
                    value={customWorkUnit}
                    onChange={(e) => setCustomWorkUnit(e.target.value)}
                  >
                    {ESTIMATE_CUSTOM_WORK_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.customWorkField}>
                  <span>Цена за ед.</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customWorkPrice}
                    onChange={(e) => {
                      setCustomWorkPrice(e.target.value);
                      if (customWorkError) setCustomWorkError(null);
                    }}
                    placeholder="0"
                  />
                </label>
                <button
                  type="button"
                  className={styles.customWorkAddButton}
                  onClick={() => void addCustomWorkToCalculator()}
                  title="Добавить вид работ в расчёт активного помещения"
                >
                  <PlusCircleIcon className={styles.addButtonIcon} aria-hidden />В расчёт
                </button>
              </div>
              {customWorkError ? <p className={styles.customWorkError}>{customWorkError}</p> : null}
            </div>
          ) : null}
        </section>

        {showPrices && (
          <aside className={styles.calculator}>
            <div className={styles.calcHeaderRow}>
              <h2 className={styles.sectionTitle}>
                Расчёты по помещениям
                {totalAllRooms !== null && totalAllRooms > 0 && (
                  <span className={styles.calcHeaderTotal}> · {formatPrice(totalAllRooms)}</span>
                )}
              </h2>
              <button
                type="button"
                className={styles.addCalcButton}
                onClick={() => void addCalculation()}
                title="Добавить помещение"
                aria-label="Добавить помещение"
              >
                <PlusCircleIcon className={styles.addCalcButtonIcon} />
              </button>
            </div>
            <div className={styles.calcCards}>
              {calculations.map((calc) => (
                <div
                  key={calc.id}
                  className={`${styles.calcCard} ${calc.id === activeCalcId ? styles.calcCardActive : ''}`}
                  onClick={() => setActiveCalcId(calc.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCalcId(calc.id);
                    }
                  }}
                >
                  <div className={styles.calcCardHeader}>
                    <input
                      value={calc.name}
                      onChange={(e) => void updateCalcName(calc.id, e.target.value)}
                      onFocus={() => setActiveCalcId(calc.id)}
                      className={styles.calcNameInput}
                      placeholder="Название помещения"
                    />
                    <span className={styles.calcSummaryTotal}>
                      {calc.loading ? '…' : calc.result ? formatPrice(calc.result.total) : '—'}
                    </span>
                    <button
                      type="button"
                      className={styles.calcCollapseButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapsed(calc.id);
                      }}
                      aria-label={calc.collapsed ? 'Развернуть' : 'Свернуть'}
                    >
                      {calc.collapsed ? (
                        <ChevronDownIcon className={styles.calcCollapseIcon} />
                      ) : (
                        <ChevronUpIcon className={styles.calcCollapseIcon} />
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.calcRemoveButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeCalculation(calc.id);
                      }}
                      aria-label="Удалить помещение"
                    >
                      <XMarkIcon className={styles.calcRemoveIcon} />
                    </button>
                  </div>
                  {!calc.collapsed && (
                    <div className={styles.calcCardBody}>
                      {calc.lines.length === 0 ? (
                        <p className={styles.calcEmpty}>
                          Добавьте виды работ из таблицы и укажите количество.
                        </p>
                      ) : (
                        <>
                          <ul className={styles.calcList}>
                            {calc.lines.map((line) => (
                              <li key={line.itemId} className={styles.calcLine}>
                                <div className={styles.calcLineInfo}>
                                  <span className={styles.calcLineName}>{line.name}</span>
                                  <span className={styles.calcLinePrice}>
                                    {formatPrice(line.price)} / {line.unit}
                                  </span>
                                </div>
                                <div className={styles.calcLineControls}>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      const n = v === '' ? 0 : parseFloat(v);
                                      void updateQuantity(
                                        calc.id,
                                        line.itemId,
                                        Number.isNaN(n) ? 0 : n
                                      );
                                    }}
                                    className={styles.quantityInput}
                                  />
                                  <button
                                    type="button"
                                    className={styles.removeButton}
                                    onClick={() => void removeFromCalculator(calc.id, line.itemId)}
                                    title="Убрать"
                                  >
                                    ×
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <div
                            className={styles.calcLoading}
                            aria-live="polite"
                            aria-busy={calc.loading}
                          >
                            {calc.loading ? 'Расчёт…' : '\u00a0'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!hideAddToCart ? (
              <>
                <button
                  type="button"
                  className={`${styles.addToCartButton} ${isInCart ? styles.addToCartButtonSuccess : ''}`}
                  onClick={handleAddToCart}
                  disabled={addToCartLoading || isInCart || !hasAnyCalcLines}
                  title={
                    isInCart
                      ? 'Уже в корзине'
                      : 'Добавить перечень работ в корзину (1 позиция = 1 категория)'
                  }
                >
                  {isInCart ? (
                    <CheckCircleIconSolid className={styles.addToCartIcon} />
                  ) : (
                    <ShoppingCartIcon className={styles.addToCartIcon} />
                  )}
                  {addToCartLoading
                    ? 'Добавление...'
                    : isInCart
                      ? `В корзине${lastAddedTotal != null ? ` · ${formatPrice(lastAddedTotal)}` : ''}`
                      : 'В корзину'}
                </button>
                {addToCartError && <p className={styles.orderError}>{addToCartError}</p>}
              </>
            ) : null}
          </aside>
        )}
      </div>
      <ConfirmModal
        isOpen={detachConfirmOpen}
        onClose={() => {
          setDetachConfirmOpen(false);
          detachResolverRef.current?.(false);
          detachResolverRef.current = null;
        }}
        onConfirm={() => {
          setDetachConfirmOpen(false);
          detachResolverRef.current?.(true);
          detachResolverRef.current = null;
        }}
        title="Удалить расчёт из корзины?"
        message="Любые изменения расчёта (включая добавление помещения) удалят его из корзины. После редактирования можно снова отправить в корзину."
        confirmText="Удалить и продолжить"
        cancelText="Отмена"
        variant="danger"
      />
      <ConfirmModal
        isOpen={pendingReviewConfirmOpen}
        onClose={() => {
          setPendingReviewConfirmOpen(false);
          pendingReviewResolverRef.current?.(false);
          pendingReviewResolverRef.current = null;
        }}
        onConfirm={() => {
          setPendingReviewConfirmOpen(false);
          pendingReviewResolverRef.current?.(true);
          pendingReviewResolverRef.current = null;
        }}
        title="Обновить заказ на проверке?"
        message="У вас уже есть заказ на проверке. Завершите оформление заказа. При изменении состава заказа производится полное переоформление заказа. При этом все незавершённые заказы будут отменены! Продолжить?"
        confirmText="Да"
        cancelText="Нет"
      />
    </div>
  );
}
