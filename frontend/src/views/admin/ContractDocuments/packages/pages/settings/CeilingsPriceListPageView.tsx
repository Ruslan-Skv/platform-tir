'use client';

import type { CeilingsPriceItem } from '@/shared/api/admin-contract-document-packages';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import type { FabricAdminBlock } from '../../families/product-like/ceilings/ceilingsFabricCatalog';
import { resolveGoodsGroupMarkup } from '../../families/product-like/ceilings/ceilingsGoodsCatalog';
import styles from './CeilingsPriceListPage.module.css';
import { SettingsPageLayout } from './SettingsPageLayout';
import type { useCeilingsPriceListPage } from './hooks/useCeilingsPriceListPage';

type Props = ReturnType<typeof useCeilingsPriceListPage>;

export function CeilingsPriceListPageView(model: Props) {
  const {
    loading,
    saving,
    error,
    success,
    category,
    setCategory,
    categories,
    categoryLabels,
    settings,
    setSettings,
    filtered,
    fabricBlocks,
    goodsBlocks,
    search,
    setSearch,
    updateItem,
    setGoodsGroupMarkup,
    addItem,
    addItemToBlock,
    addGoodsToBlock,
    removeItem,
    save,
  } = model;

  return (
    <SettingsPageLayout
      title="Прайсы · Натяжные потолки"
      subtitle={
        <>
          Справочник комплектующих для спецификации CEILINGS. Полотно — как на листе «ПрайсП»:
          отдельные зависимые списки (фактура → серия → цвет).
        </>
      }
      error={error}
      ok={success}
    >
      <section className={styles.pageCard}>
        <h2 className={cdEstimateTab.sectionTitle}>Наценки по умолчанию</h2>
        {loading ? (
          <p className={cdTemplates.hint}>Загрузка…</p>
        ) : (
          <>
            <div className={styles.markupsGrid}>
              <div className={cdEstimateTab.field}>
                <label htmlFor="ceilings-fabric-markup">Наценка полотна</label>
                <input
                  id="ceilings-fabric-markup"
                  type="number"
                  step="0.1"
                  value={settings.fabricMarkup}
                  disabled={saving}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, fabricMarkup: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className={cdEstimateTab.field}>
                <label htmlFor="ceilings-profile-markup">Наценка профилей</label>
                <input
                  id="ceilings-profile-markup"
                  type="number"
                  step="0.1"
                  value={settings.profileMarkup}
                  disabled={saving}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, profileMarkup: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className={cdEstimateTab.field}>
                <label htmlFor="ceilings-tape-markup">Наценка лент</label>
                <input
                  id="ceilings-tape-markup"
                  type="number"
                  step="0.1"
                  value={settings.tapeMarkup}
                  disabled={saving}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, tapeMarkup: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className={cdEstimateTab.field}>
                <label htmlFor="ceilings-extra-markup">Доп. наценка спецификации, %</label>
                <input
                  id="ceilings-extra-markup"
                  type="number"
                  step="0.1"
                  value={settings.defaultExtraMarkupPercent}
                  disabled={saving}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      defaultExtraMarkupPercent: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <h2 className={cdEstimateTab.sectionTitle}>Позиции прайса</h2>

            <div className={styles.categoryTabs} role="tablist" aria-label="Категория прайса">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={category === c}
                  className={`${styles.categoryTab} ${
                    category === c ? styles.categoryTabActive : ''
                  }`}
                  onClick={() => setCategory(c)}
                >
                  {categoryLabels[c]}
                </button>
              ))}
            </div>

            <div className={styles.toolbar}>
              <div className={`${cdEstimateTab.field} ${styles.searchField}`}>
                <input
                  id="ceilings-price-search"
                  type="search"
                  placeholder="Поиск…"
                  value={search}
                  disabled={saving}
                  autoComplete="off"
                  aria-label="Поиск по наименованию"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {category !== 'FABRIC' && category !== 'GOODS' ? (
                <button
                  data-admin-mutation
                  type="button"
                  className={cdWorkspace.secondaryBtn}
                  disabled={saving}
                  onClick={addItem}
                >
                  Добавить
                </button>
              ) : null}
              <button
                data-admin-mutation
                type="button"
                className={cdWorkspace.primaryBtn}
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>

            {category === 'FABRIC' ? (
              <div className={styles.fabricBlocks}>
                <p className={cdTemplates.hint}>
                  Блоки соответствуют умным таблицам Excel «ПрайсП». Цена задаётся у серии (2-й
                  список); цвета (3-й список) наследуют цену своей серии.
                </p>
                {fabricBlocks.map((block) => (
                  <FabricBlockTable
                    key={block.key}
                    block={block}
                    saving={saving}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    onAdd={() => addItemToBlock(block)}
                  />
                ))}
                {fabricBlocks.length === 0 ? (
                  <p className={cdTemplates.hint}>Нет позиций полотна</p>
                ) : null}
              </div>
            ) : category === 'GOODS' ? (
              <div className={styles.fabricBlocks}>
                <p className={cdTemplates.hint}>
                  Блоки как на листе «СЗ на товар» (колонки I–K). Общая наценка блока пересчитывает
                  розницу всех позиций: розница = закуп × наценка.
                </p>
                {goodsBlocks.map((block) => {
                  const groupMarkup = resolveGoodsGroupMarkup(
                    block.key,
                    settings.goodsGroupMarkups
                  );
                  return (
                    <section key={block.key} className={styles.fabricBlock}>
                      <div className={styles.fabricBlockHeader}>
                        <h3 className={styles.fabricBlockTitle}>{block.title}</h3>
                        <div className={styles.goodsBlockMarkup}>
                          <label htmlFor={`goods-markup-${block.key}`}>Наценка блока</label>
                          <input
                            id={`goods-markup-${block.key}`}
                            type="number"
                            step="0.1"
                            min="0"
                            value={groupMarkup}
                            disabled={saving}
                            onChange={(e) =>
                              setGoodsGroupMarkup(block.key, Number(e.target.value) || 0)
                            }
                          />
                        </div>
                        <button
                          data-admin-mutation
                          type="button"
                          className={cdWorkspace.secondaryBtn}
                          disabled={saving}
                          onClick={() => addGoodsToBlock(block.key)}
                        >
                          + Строка
                        </button>
                      </div>
                      <PriceItemsTable
                        items={block.items}
                        saving={saving}
                        showPrices
                        updateItem={updateItem}
                        removeItem={removeItem}
                      />
                    </section>
                  );
                })}
              </div>
            ) : (
              <PriceItemsTable
                items={filtered}
                saving={saving}
                showPrices
                updateItem={updateItem}
                removeItem={removeItem}
              />
            )}

            <div className={`${cdHub.packageSettingsActions} ${styles.actionsRow}`}>
              <button
                data-admin-mutation
                type="button"
                className={cdWorkspace.primaryBtn}
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </section>
    </SettingsPageLayout>
  );
}

function FabricBlockTable({
  block,
  saving,
  updateItem,
  removeItem,
  onAdd,
}: {
  block: FabricAdminBlock;
  saving: boolean;
  updateItem: (id: string, patch: Partial<CeilingsPriceItem>) => void;
  removeItem: (id: string) => void;
  onAdd: () => void;
}) {
  const showPrices = block.level === 'SERIES';
  return (
    <section className={styles.fabricBlock}>
      <div className={styles.fabricBlockHeader}>
        <h3 className={styles.fabricBlockTitle}>{block.title}</h3>
        <button
          data-admin-mutation
          type="button"
          className={cdWorkspace.secondaryBtn}
          disabled={saving}
          onClick={onAdd}
        >
          + Строка
        </button>
      </div>
      {block.level === 'COLOR' ? (
        <p className={cdTemplates.hint}>
          Цвета серии «{block.key}» — без собственной цены (берётся цена серии).
        </p>
      ) : null}
      <PriceItemsTable
        items={block.items}
        saving={saving}
        showPrices={showPrices}
        updateItem={updateItem}
        removeItem={removeItem}
      />
    </section>
  );
}

function PriceItemsTable({
  items,
  saving,
  showPrices,
  updateItem,
  removeItem,
}: {
  items: CeilingsPriceItem[];
  saving: boolean;
  showPrices: boolean;
  updateItem: (id: string, patch: Partial<CeilingsPriceItem>) => void;
  removeItem: (id: string) => void;
}) {
  return (
    <div className={cdWorkspace.tableWrap}>
      <table className={cdWorkspace.table}>
        <thead>
          <tr>
            <th>Наименование</th>
            {showPrices ? (
              <>
                <th>Ед.</th>
                <th>Закуп</th>
                <th>Наценка</th>
                <th>Розница</th>
              </>
            ) : null}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>
                <input
                  className={styles.cellInput}
                  value={it.name}
                  disabled={saving}
                  aria-label="Наименование"
                  onChange={(e) => {
                    const name = e.target.value;
                    const attrs = { ...it.attributes };
                    if (attrs.fabricLevel === 'SERIES') {
                      attrs.series = name;
                      attrs.article = name;
                    } else if (attrs.fabricLevel === 'COLOR') {
                      attrs.color = name;
                      attrs.article = name;
                    } else if (attrs.fabricLevel === 'TEXTURE') {
                      attrs.texture = name;
                      attrs.article = name;
                    }
                    updateItem(it.id, { name, attributes: attrs });
                  }}
                />
              </td>
              {showPrices ? (
                <>
                  <td>
                    <input
                      className={`${styles.cellInput} ${styles.cellInputNarrow}`}
                      value={it.unit}
                      disabled={saving}
                      aria-label="Единица"
                      onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className={`${styles.cellInput} ${styles.cellInputNum}`}
                      type="number"
                      value={it.purchasePrice}
                      disabled={saving}
                      aria-label="Закуп"
                      onChange={(e) =>
                        updateItem(it.id, {
                          purchasePrice: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className={`${styles.cellInput} ${styles.cellInputMarkup}`}
                      type="number"
                      step="0.1"
                      value={it.markup ?? ''}
                      disabled={saving}
                      aria-label="Наценка"
                      onChange={(e) =>
                        updateItem(it.id, {
                          markup: e.target.value === '' ? null : Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className={`${styles.cellInput} ${styles.cellInputNum}`}
                      type="number"
                      value={it.retailPrice}
                      disabled={saving}
                      aria-label="Розница"
                      onChange={(e) =>
                        updateItem(it.id, {
                          retailPrice: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                </>
              ) : null}
              <td className={styles.actionsCell}>
                <button
                  data-admin-mutation
                  type="button"
                  className={cdWorkspace.dangerBtn}
                  disabled={saving}
                  onClick={() => removeItem(it.id)}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={showPrices ? 6 : 2} className={styles.emptyCell}>
                Нет позиций
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
