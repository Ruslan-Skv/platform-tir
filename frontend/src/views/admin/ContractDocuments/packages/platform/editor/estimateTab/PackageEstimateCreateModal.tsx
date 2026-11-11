'use client';

import { useEffect, useId, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';

import { ESTIMATE_CUSTOM_WORK_UNITS } from '../../estimates/estimateCustomWorkItems';
import type { PackageEstimateCreateModalModel } from '../../hooks/estimate/usePackageEstimateCreateModal';
import styles from './PackageEstimateCreateModal.module.css';

function formatRub(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

/**
 * Модалка создания/правки небольшого расчёта прямо из вкладки «Счёт-заказ»/«Смета»:
 * заказчик/адрес/направление берутся из договора, новый расчёт сразу прикрепляется к нему,
 * правка — пересчитывает смету и суммы договора. Для расчётов со связанными экземплярами
 * и несколькими помещениями — раздел «Расчёты».
 */
export function PackageEstimateCreateModal({
  model,
  isProductDirectionPackage,
}: {
  model: PackageEstimateCreateModalModel;
  isProductDirectionPackage: boolean;
}) {
  const {
    isOpen,
    close,
    isEditing,
    isDirty,
    titleDraft,
    setTitleDraft,
    categories,
    categoriesLoading,
    selectedSlugs,
    toggleCategory,
    detailBySlug,
    qtyBySlug,
    setQuantity,
    customItemsBySlug,
    customDraftBySlug,
    setCustomDraftField,
    addCustomItem,
    removeCustomItem,
    customErrorBySlug,
    customNoMarkupBySlug,
    toggleCustomNoMarkup,
    markupRaw,
    setMarkupRaw,
    previewTotal,
    error,
    saving,
    save,
  } = model;

  /** Чипы категорий сворачиваются после выбора — чтобы списки работ были ближе (как «Настройки списка»). */
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const categoriesBodyId = useId();
  const toggleCategoriesCollapsed = () => setCategoriesCollapsed((value) => !value);

  /** Открытие модалки: при правке категории уже выбраны — сразу сворачиваем чипы. */
  useEffect(() => {
    if (isOpen) setCategoriesCollapsed(isEditing);
  }, [isOpen, isEditing]);

  const totalLabel =
    selectedSlugs.length === 0
      ? '—'
      : previewTotal === null
        ? 'цены части работ скрыты в каталоге'
        : formatRub(previewTotal);

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={
        isEditing
          ? 'Редактирование расчёта'
          : isProductDirectionPackage
            ? 'Новый расчёт (счёт-заказ)'
            : 'Новый расчёт (смета договора)'
      }
      size="lg"
      alignTop
      showCloseButton
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          {isEditing
            ? 'Изменения сохраняются в этот расчёт и сразу пересчитывают смету и суммы этого договора. Заказчик, адрес объекта и направление — из договора.'
            : 'Небольшой расчёт: создаётся здесь и сразу прикрепляется к этому договору. Заказчик, адрес объекта и направление — из договора. Для больших смет и связанных экземпляров используйте раздел «Расчёты».'}
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="quick_estimate_title">Название расчёта *</label>
            <input
              id="quick_estimate_title"
              type="text"
              value={titleDraft}
              placeholder="Например: ЖК Парк, кв. 54"
              onChange={(e) => setTitleDraft(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="quick_estimate_markup">Наценка, %</label>
            <input
              id="quick_estimate_markup"
              type="number"
              min={0}
              max={999}
              step={0.1}
              value={markupRaw}
              placeholder="наценка объекта"
              onChange={(e) => setMarkupRaw(e.target.value)}
            />
          </div>
        </div>

        <section className={styles.categoriesPanel} aria-label="Категории работ">
          <div className={styles.categoriesPanelHeader}>
            <button
              type="button"
              className={styles.categoriesPanelToggle}
              onClick={toggleCategoriesCollapsed}
              aria-expanded={!categoriesCollapsed}
              aria-controls={categoriesBodyId}
            >
              <span className={styles.categoriesPanelChevron} aria-hidden>
                {categoriesCollapsed ? '▸' : '▾'}
              </span>
              <span className={styles.categoriesPanelTitle}>
                {categoriesCollapsed
                  ? `Категории работ${selectedSlugs.length > 0 ? ` (${selectedSlugs.length})` : ''}`
                  : 'Свернуть категории'}
              </span>
            </button>
            {categoriesCollapsed ? (
              <button
                type="button"
                className={styles.categoriesPanelExpandLink}
                onClick={toggleCategoriesCollapsed}
              >
                Изменить
              </button>
            ) : null}
          </div>

          {categoriesCollapsed ? (
            <button
              type="button"
              className={styles.categoriesSummary}
              onClick={toggleCategoriesCollapsed}
              aria-label="Развернуть категории работ"
            >
              {selectedSlugs.length === 0 ? (
                <span className={styles.categoriesSummaryChip} title="Нажмите, чтобы выбрать">
                  Не выбраны — нажмите, чтобы выбрать
                </span>
              ) : (
                selectedSlugs.map((slug) => (
                  <span
                    key={slug}
                    className={styles.categoriesSummaryChip}
                    title={categories.find((c) => c.slug === slug)?.name ?? slug}
                  >
                    {categories.find((c) => c.slug === slug)?.name ?? slug}
                  </span>
                ))
              )}
            </button>
          ) : (
            <div id={categoriesBodyId} className={styles.categoriesCard}>
              {categoriesLoading ? (
                <p data-modal-form-hint style={{ margin: 0, flex: '1 1 100%' }}>
                  Загрузка каталога работ…
                </p>
              ) : categories.length === 0 ? (
                <p data-modal-form-hint style={{ margin: 0, flex: '1 1 100%' }}>
                  Каталог работ недоступен — обновите страницу.
                </p>
              ) : (
                categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    className={
                      selectedSlugs.includes(c.slug)
                        ? `${styles.categoryChip} ${styles.categoryChipActive}`
                        : styles.categoryChip
                    }
                    onClick={() => toggleCategory(c.slug)}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        {selectedSlugs.length === 0 ? (
          <p data-modal-form-hint>Выберите хотя бы одну категорию работ.</p>
        ) : null}

        {selectedSlugs.map((slug) => {
          const detail = detailBySlug[slug];
          const categoryName = categories.find((c) => c.slug === slug)?.name ?? slug;
          const qtyMap = qtyBySlug[slug] ?? {};
          const customDefs = customItemsBySlug[slug] ?? {};
          const customDraft = customDraftBySlug[slug] ?? { name: '', unit: 'шт', price: '' };
          const customIds = Object.keys(customDefs);
          return (
            <section key={slug} className={styles.categorySection}>
              <h5 className={styles.categorySectionTitle}>
                {categoryName}
                <span className={styles.categorySectionCount}>
                  укажите количество у нужных работ
                </span>
              </h5>
              {detail?.loading ? (
                <p data-modal-form-hint>Загрузка работ категории…</p>
              ) : (
                <div className={styles.worksList}>
                  {(detail?.items ?? []).map((item) => {
                    const qty = qtyMap[item.id] ?? '';
                    return (
                      <div
                        key={item.id}
                        className={
                          qty ? `${styles.workRow} ${styles.workRowActive}` : styles.workRow
                        }
                      >
                        <span className={styles.workName}>{item.name}</span>
                        <span className={styles.workMeta}>{item.unit}</span>
                        <span className={styles.workMeta}>
                          {typeof item.price === 'number' ? formatRub(item.price) : '—'}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          className={styles.workQtyInput}
                          value={qty}
                          placeholder="0"
                          title="Количество; 0 или пусто — работу не включать"
                          onChange={(e) => setQuantity(slug, item.id, e.target.value)}
                        />
                      </div>
                    );
                  })}
                  {customIds.map((itemId) => {
                    const def = customDefs[itemId];
                    if (!def) return null;
                    const qty = qtyMap[itemId] ?? '';
                    return (
                      <div key={itemId} className={`${styles.workRow} ${styles.workRowActive}`}>
                        <span className={styles.workName}>
                          {def.name} <em style={{ opacity: 0.6 }}>(доп. работа)</em>
                        </span>
                        <span className={styles.workMeta}>{def.unit}</span>
                        <span className={styles.workMeta}>{formatRub(def.price)}</span>
                        <span style={{ display: 'flex', gap: 4 }}>
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className={styles.workQtyInput}
                            value={qty}
                            onChange={(e) => setQuantity(slug, itemId, e.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.workRowRemove}
                            aria-label={`Убрать «${def.name}»`}
                            title="Убрать доп. работу"
                            onClick={() => removeCustomItem(slug, itemId)}
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.customBlock}>
                <p className={styles.customBlockTitle}>Дополнительные виды работ</p>
                <div className={styles.customAddRow}>
                  <input
                    type="text"
                    value={customDraft.name}
                    placeholder="Название работы"
                    onChange={(e) => setCustomDraftField(slug, 'name', e.target.value)}
                  />
                  <select
                    value={customDraft.unit}
                    onChange={(e) => setCustomDraftField(slug, 'unit', e.target.value)}
                    aria-label="Единица измерения доп. работы"
                  >
                    {ESTIMATE_CUSTOM_WORK_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={customDraft.price}
                    placeholder="Цена, ₽"
                    onChange={(e) => setCustomDraftField(slug, 'price', e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.customAddBtn}
                    onClick={() => addCustomItem(slug)}
                  >
                    + Добавить
                  </button>
                </div>
                <label className={styles.customNoMarkupLabel}>
                  <input
                    type="checkbox"
                    checked={Boolean(customNoMarkupBySlug[slug])}
                    onChange={() => toggleCustomNoMarkup(slug)}
                  />
                  Наценка расчёта не применяется к доп. работам
                </label>
                {customErrorBySlug[slug] ? (
                  <p className={styles.customError}>{customErrorBySlug[slug]}</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className={styles.stickyFooter}>
        {error ? (
          <p data-modal-form-error role="alert">
            {error}
          </p>
        ) : null}
        <div data-modal-form-actions className={styles.footerActions}>
          <span className={styles.footerTotal}>
            Стоимость расчёта: <strong className={styles.footerTotalValue}>{totalLabel}</strong>
            {previewTotal !== null && selectedSlugs.length > 0 ? (
              <span className={styles.footerTotalNote}>без наценки и скидки договора</span>
            ) : null}
          </span>
          <span className={styles.footerButtons}>
            <button type="button" data-modal-btn="secondary" onClick={close}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="primary"
              disabled={
                saving ||
                selectedSlugs.length === 0 ||
                !titleDraft.trim() ||
                (isEditing && !isDirty)
              }
              title={isEditing && !isDirty ? 'Сначала измените расчёт' : undefined}
              onClick={() => {
                void save();
              }}
            >
              {saving
                ? isEditing
                  ? 'Сохранение…'
                  : 'Создание…'
                : isEditing
                  ? 'Сохранить'
                  : 'Создать и прикрепить'}
            </button>
          </span>
        </div>
      </div>
    </Modal>
  );
}
