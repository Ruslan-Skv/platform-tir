'use client';

import Link from 'next/link';

import type { CeilingsPriceItem } from '@/shared/api/admin-contract-document-packages';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import type { FabricAdminBlock } from '../../families/product-like/ceilings/ceilingsFabricCatalog';
import { resolveGoodsGroupMarkup } from '../../families/product-like/ceilings/ceilingsGoodsCatalog';
import styles from './CeilingsPriceListPage.module.css';
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

  const itemsCount =
    category === 'FABRIC'
      ? fabricBlocks.reduce((n, b) => n + b.items.length, 0)
      : category === 'GOODS'
        ? goodsBlocks.reduce((n, b) => n + b.items.length, 0)
        : filtered.length;

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Прайсы · Натяжные потолки</h1>
          {!loading ? <span className={styles.count}>{itemsCount}</span> : null}
          <AdminSaveNotice visible={Boolean(success)} />
        </div>
        <button
          data-admin-mutation
          type="button"
          className={styles.addButton}
          disabled={loading || saving}
          onClick={() => void save()}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>

      <p className={styles.hint}>
        Справочник комплектующих для спецификации CEILINGS. Полотно — зависимые списки «ПрайсП»;
        товар — блоки «СЗ на товар».
      </p>

      {error ? (
        <div className={styles.messageSlot}>
          <AdminFormMessage type="error">{error}</AdminFormMessage>
        </div>
      ) : null}

      {loading ? (
        <div className={styles.loadingOverlay}>Загрузка…</div>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Наценки по умолчанию</h2>
            <div className={styles.markupsGrid}>
              <div className={styles.field}>
                <label htmlFor="ceilings-fabric-markup">Полотно</label>
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
              <div className={styles.field}>
                <label htmlFor="ceilings-profile-markup">Профили</label>
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
              <div className={styles.field}>
                <label htmlFor="ceilings-tape-markup">Ленты</label>
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
              <div className={styles.field}>
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
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Позиции прайса</h2>

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
              <input
                id="ceilings-price-search"
                className={styles.searchInput}
                type="search"
                placeholder="Поиск…"
                value={search}
                disabled={saving}
                autoComplete="off"
                aria-label="Поиск по наименованию"
                onChange={(e) => setSearch(e.target.value)}
              />
              {category !== 'FABRIC' && category !== 'GOODS' ? (
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.secondaryButton}
                  disabled={saving}
                  onClick={addItem}
                >
                  Добавить
                </button>
              ) : null}
            </div>

            {category === 'FABRIC' ? (
              <div className={styles.blocks}>
                <p className={styles.hint} style={{ marginBottom: 0 }}>
                  Цена у серии (2-й список); цвета (3-й) наследуют цену серии.
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
                  <p className={styles.hint}>Нет позиций полотна</p>
                ) : null}
              </div>
            ) : category === 'GOODS' ? (
              <div className={styles.blocks}>
                <p className={styles.hint} style={{ marginBottom: 0 }}>
                  Наценка блока: розница = закуп × наценка.
                </p>
                {goodsBlocks.map((block) => {
                  const groupMarkup = resolveGoodsGroupMarkup(
                    block.key,
                    settings.goodsGroupMarkups
                  );
                  return (
                    <section key={block.key} className={styles.block}>
                      <div className={styles.blockHeader}>
                        <h3 className={styles.blockTitle}>{block.title}</h3>
                        <div className={styles.goodsBlockMarkup}>
                          <label htmlFor={`goods-markup-${block.key}`}>Наценка</label>
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
                          className={styles.secondaryButton}
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
              <div className={styles.block}>
                <PriceItemsTable
                  items={filtered}
                  saving={saving}
                  showPrices
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              </div>
            )}
          </section>
        </>
      )}
    </div>
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
    <section className={styles.block}>
      <div className={styles.blockHeader}>
        <h3 className={styles.blockTitle}>{block.title}</h3>
        <button
          data-admin-mutation
          type="button"
          className={styles.secondaryButton}
          disabled={saving}
          onClick={onAdd}
        >
          + Строка
        </button>
      </div>
      {block.level === 'COLOR' ? (
        <p className={styles.blockHint}>Цвета без собственной цены — берётся цена серии.</p>
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
    <div className={styles.tableWrap}>
      <table className={styles.table}>
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
                <AdminTableIconButton
                  title="Удалить"
                  data-admin-mutation
                  onClick={() => {
                    if (saving) return;
                    removeItem(it.id);
                  }}
                >
                  <DeleteIcon />
                </AdminTableIconButton>
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
