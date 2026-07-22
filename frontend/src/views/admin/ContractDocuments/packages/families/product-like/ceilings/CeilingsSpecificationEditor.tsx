'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import attachStyles from '../../../platform/editor/estimateTab/PackageEstimateAttach.module.css';
import {
  fabricHasColorOptions,
  findFabricSeriesItem,
  listFabricColors,
  listFabricSeries,
  listFabricTextures,
} from './ceilingsFabricCatalog';
import { groupGoodsAdminBlocks } from './ceilingsGoodsCatalog';
import type { CeilingsPriceItem } from './ceilingsPriceTypes';
import {
  type CeilingsCeilingBlock,
  type CeilingsFabricLine,
  type CeilingsNamedQtyLine,
  type CeilingsSpecification,
  applyFabricCascadeSelection,
  applyPriceItemToNamed,
  applyPriceItemToTape,
  computeCeilingsSpecificationNetTotal,
  formatCeilingsMoney,
  newCeilingsCeilingBlock,
  newCeilingsFabricLine,
  newCeilingsNamedQtyLine,
  sumCeilingsCeilingGross,
} from './ceilingsSpecification';

type Props = {
  spec: CeilingsSpecification;
  priceItems: CeilingsPriceItem[];
  readOnly: boolean;
  fieldClassName: string;
  fieldsRowClassName: string;
  onChange: (spec: CeilingsSpecification) => void;
};

function activeByCategory(items: CeilingsPriceItem[], category: string) {
  return items
    .filter((it) => it.active && it.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
}

export function CeilingsSpecificationEditor({
  spec,
  priceItems,
  readOnly,
  fieldClassName,
  fieldsRowClassName,
  onChange,
}: Props) {
  const textures = useMemo(() => listFabricTextures(priceItems), [priceItems]);
  const tapes = useMemo(() => activeByCategory(priceItems, 'TAPE'), [priceItems]);
  const profiles = useMemo(() => activeByCategory(priceItems, 'PROFILE'), [priceItems]);
  const extras = useMemo(() => activeByCategory(priceItems, 'FABRIC_EXTRA'), [priceItems]);
  const goods = useMemo(() => activeByCategory(priceItems, 'GOODS'), [priceItems]);
  const totals = computeCeilingsSpecificationNetTotal(spec);

  const updateCeiling = (id: string, patch: Partial<CeilingsCeilingBlock>) => {
    onChange({
      ...spec,
      ceilings: spec.ceilings.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const addCeiling = () => {
    onChange({
      ...spec,
      ceilings: [...spec.ceilings, newCeilingsCeilingBlock(spec.ceilings.length + 1)],
    });
  };

  const removeCeiling = (id: string) => {
    if (spec.ceilings.length <= 1) return;
    onChange({ ...spec, ceilings: spec.ceilings.filter((c) => c.id !== id) });
  };

  return (
    <div className={cdProduct.ceilingsSpecificationEditor}>
      <div className={fieldsRowClassName}>
        <div className={`${fieldClassName} ${cdProduct.doorsSpecificationDiscountField}`}>
          <label htmlFor="ceilings-extra-markup">Доп. наценка, %</label>
          <input
            id="ceilings-extra-markup"
            type="text"
            inputMode="decimal"
            value={spec.extraMarkupPercent}
            disabled={readOnly}
            placeholder="10"
            autoComplete="off"
            onChange={(e) => onChange({ ...spec, extraMarkupPercent: e.target.value })}
          />
        </div>
        <div className={`${fieldClassName} ${cdProduct.doorsSpecificationDiscountField}`}>
          <label htmlFor="ceilings-discount">Скидка, %</label>
          <input
            id="ceilings-discount"
            type="text"
            inputMode="decimal"
            value={spec.discountPercent}
            disabled={readOnly}
            placeholder="0"
            autoComplete="off"
            onChange={(e) => onChange({ ...spec, discountPercent: e.target.value })}
          />
        </div>
      </div>

      <p className={cdProduct.doorsSpecificationSectionTotal}>
        Итого: {formatCeilingsMoney(totals.grossTotal)} руб.
        {totals.extraMarkupPercent > 0
          ? ` · с наценкой ${formatCeilingsMoney(totals.withExtraMarkup)} руб.`
          : ''}
        {totals.discountPercent > 0
          ? ` · со скидкой ${formatCeilingsMoney(totals.netTotal)} руб.`
          : ''}
      </p>

      <div className={cdProduct.ceilingsSpecificationCards}>
        {spec.ceilings.map((ceiling) => {
          const ceilingSum = sumCeilingsCeilingGross(ceiling);
          return (
            <section key={ceiling.id} className={cdProduct.ceilingsSpecificationCard}>
              <div className={cdProduct.ceilingsSpecificationCardHeader}>
                <div className={`${fieldClassName} ${cdProduct.ceilingsSpecificationTitleField}`}>
                  <label htmlFor={`ceiling-title-${ceiling.id}`}>Потолок</label>
                  <input
                    id={`ceiling-title-${ceiling.id}`}
                    type="text"
                    value={ceiling.title}
                    disabled={readOnly}
                    autoComplete="off"
                    onChange={(e) => updateCeiling(ceiling.id, { title: e.target.value })}
                  />
                </div>
                <p className={cdProduct.ceilingsSpecificationCardSum}>
                  {formatCeilingsMoney(ceilingSum)} руб.
                </p>
                {!readOnly && spec.ceilings.length > 1 ? (
                  <button
                    type="button"
                    className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn}`}
                    onClick={() => removeCeiling(ceiling.id)}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>

              <h4 className={cdProduct.ceilingsSpecificationSectionTitle}>Полотно</h4>
              {ceiling.fabrics.map((fabric, fabricIndex) => (
                <FabricCascadeRow
                  key={fabric.id}
                  fabric={fabric}
                  fabricIndex={fabricIndex}
                  priceItems={priceItems}
                  textures={textures}
                  readOnly={readOnly}
                  canRemove={ceiling.fabrics.length > 1}
                  onChange={(next) =>
                    updateCeiling(ceiling.id, {
                      fabrics: ceiling.fabrics.map((f) => (f.id === fabric.id ? next : f)),
                    })
                  }
                  onRemove={() =>
                    updateCeiling(ceiling.id, {
                      fabrics: ceiling.fabrics.filter((f) => f.id !== fabric.id),
                    })
                  }
                />
              ))}
              {!readOnly ? (
                <button
                  type="button"
                  className={`${cdWorkspace.secondaryBtn} ${cdProduct.ceilingsSpecificationAddLineBtn}`}
                  onClick={() =>
                    updateCeiling(ceiling.id, {
                      fabrics: [...ceiling.fabrics, newCeilingsFabricLine()],
                    })
                  }
                >
                  + Полотно
                </button>
              ) : null}

              <h4 className={cdProduct.ceilingsSpecificationSectionTitle}>Окантовочная лента</h4>
              <div className={cdProduct.ceilingsSpecificationLineRow}>
                <select
                  disabled={readOnly}
                  value={ceiling.tape?.priceItemId ?? ''}
                  aria-label="Окантовочная лента"
                  onChange={(e) => {
                    if (!e.target.value) {
                      updateCeiling(ceiling.id, { tape: null });
                      return;
                    }
                    const item = tapes.find((x) => x.id === e.target.value);
                    if (!item) return;
                    updateCeiling(ceiling.id, {
                      tape: applyPriceItemToTape(item, ceiling.tape?.qtyM ?? ''),
                    });
                  }}
                >
                  <option value="">Без ленты</option>
                  {tapes.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.retailPrice} ₽/{it.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="м"
                  value={ceiling.tape?.qtyM ?? ''}
                  disabled={readOnly || !ceiling.tape}
                  autoComplete="off"
                  onChange={(e) =>
                    ceiling.tape &&
                    updateCeiling(ceiling.id, {
                      tape: { ...ceiling.tape, qtyM: e.target.value },
                    })
                  }
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Цена"
                  value={ceiling.tape?.unitPrice ?? ''}
                  disabled={readOnly || !ceiling.tape}
                  autoComplete="off"
                  onChange={(e) =>
                    ceiling.tape &&
                    updateCeiling(ceiling.id, {
                      tape: { ...ceiling.tape, unitPrice: e.target.value },
                    })
                  }
                />
                <span className={cdProduct.ceilingsSpecificationLineSpacer} />
              </div>

              <NamedLinesBlock
                title="Багет / профиль"
                lines={ceiling.profiles}
                options={profiles}
                readOnly={readOnly}
                onChange={(profilesNext) => updateCeiling(ceiling.id, { profiles: profilesNext })}
              />
              <NamedLinesBlock
                title="Доп. (фотопечать, углы, вырезы…)"
                lines={ceiling.extras}
                options={extras}
                readOnly={readOnly}
                onChange={(extrasNext) => updateCeiling(ceiling.id, { extras: extrasNext })}
              />
              <NamedLinesBlock
                title="Товар (светильники, LED…)"
                lines={ceiling.goods}
                options={goods}
                groupOptions
                readOnly={readOnly}
                onChange={(goodsNext) => updateCeiling(ceiling.id, { goods: goodsNext })}
              />
            </section>
          );
        })}
      </div>

      <div className={cdProduct.doorsSpecificationActionsRow}>
        <button
          data-admin-mutation
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn} ${cdProduct.doorsSpecificationAddBtn}`}
          aria-label="Добавить потолок"
          title="Добавить потолок"
          disabled={readOnly}
          onClick={addCeiling}
        >
          <PlusIcon className={cdProduct.doorsSpecificationAddBtnIcon} aria-hidden />
        </button>
        <p className={cdProduct.doorsSpecificationSectionTotal}>Потолков: {spec.ceilings.length}</p>
      </div>
    </div>
  );
}

function FabricCascadeRow({
  fabric,
  fabricIndex,
  priceItems,
  textures,
  readOnly,
  canRemove,
  onChange,
  onRemove,
}: {
  fabric: CeilingsFabricLine;
  fabricIndex: number;
  priceItems: CeilingsPriceItem[];
  textures: string[];
  readOnly: boolean;
  canRemove: boolean;
  onChange: (next: CeilingsFabricLine) => void;
  onRemove: () => void;
}) {
  const seriesOptions = listFabricSeries(priceItems, fabric.texture);
  const seriesItem = findFabricSeriesItem(priceItems, fabric.texture, fabric.series);
  const colorOptions = listFabricColors(priceItems, fabric.texture, fabric.series);
  const needsColor = Boolean(seriesItem && fabricHasColorOptions(seriesItem));

  return (
    <div className={cdProduct.ceilingsSpecificationFabricRow}>
      <select
        disabled={readOnly}
        value={fabric.texture}
        aria-label={`Фактура полотна ${fabricIndex + 1}`}
        onChange={(e) => {
          const texture = e.target.value;
          onChange(
            applyFabricCascadeSelection(
              { ...fabric, qtyM2: fabric.qtyM2 },
              { texture, seriesItem: null }
            )
          );
        }}
      >
        <option value="">Фактура…</option>
        {textures.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        disabled={readOnly || !fabric.texture}
        value={fabric.series}
        aria-label={`Серия полотна ${fabricIndex + 1}`}
        onChange={(e) => {
          const series = e.target.value;
          const nextSeries = seriesOptions.find((x) => x.name === series) ?? null;
          const nextColors = nextSeries
            ? listFabricColors(priceItems, fabric.texture, nextSeries.name)
            : [];
          onChange(
            applyFabricCascadeSelection(fabric, {
              texture: fabric.texture,
              seriesItem: nextSeries,
              colorItem: nextColors.length ? null : undefined,
            })
          );
        }}
      >
        <option value="">Серия…</option>
        {seriesOptions.map((it) => (
          <option key={it.id} value={it.name}>
            {it.name}
            {it.retailPrice > 0 ? ` (${it.retailPrice} ₽)` : ''}
          </option>
        ))}
      </select>
      <select
        disabled={readOnly || !needsColor}
        value={fabric.color}
        aria-label={`Цвет полотна ${fabricIndex + 1}`}
        onChange={(e) => {
          const colorName = e.target.value;
          const colorItem = colorOptions.find((x) => x.name === colorName) ?? null;
          onChange(
            applyFabricCascadeSelection(fabric, {
              texture: fabric.texture,
              seriesItem: seriesItem ?? null,
              colorItem,
            })
          );
        }}
      >
        <option value="">{needsColor ? 'Цвет…' : '—'}</option>
        {colorOptions.map((it) => (
          <option key={it.id} value={it.name}>
            {it.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        inputMode="decimal"
        placeholder="м²"
        value={fabric.qtyM2}
        disabled={readOnly}
        autoComplete="off"
        onChange={(e) => onChange({ ...fabric, qtyM2: e.target.value })}
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="Цена"
        value={fabric.unitPrice}
        disabled={readOnly}
        autoComplete="off"
        onChange={(e) => onChange({ ...fabric, unitPrice: e.target.value })}
      />
      <button
        type="button"
        className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn}`}
        aria-label="Удалить полотно"
        disabled={readOnly || !canRemove}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}

function NamedLinesBlock({
  title,
  lines,
  options,
  groupOptions = false,
  readOnly,
  onChange,
}: {
  title: string;
  lines: CeilingsNamedQtyLine[];
  options: CeilingsPriceItem[];
  groupOptions?: boolean;
  readOnly: boolean;
  onChange: (lines: CeilingsNamedQtyLine[]) => void;
}) {
  const grouped = groupOptions ? groupGoodsAdminBlocks(options) : null;

  return (
    <>
      <h4 className={cdProduct.ceilingsSpecificationSectionTitle}>{title}</h4>
      {lines.map((line) => (
        <div key={line.id} className={cdProduct.ceilingsSpecificationLineRow}>
          <select
            disabled={readOnly}
            value={line.priceItemId}
            aria-label={title}
            onChange={(e) => {
              const item = options.find((x) => x.id === e.target.value);
              if (!item) {
                onChange(lines.map((l) => (l.id === line.id ? { ...l, priceItemId: '' } : l)));
                return;
              }
              onChange(lines.map((l) => (l.id === line.id ? applyPriceItemToNamed(l, item) : l)));
            }}
          >
            <option value="">Выберите…</option>
            {grouped
              ? grouped.map((block) => (
                  <optgroup key={block.key} label={block.title}>
                    {block.items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.retailPrice} ₽)
                      </option>
                    ))}
                  </optgroup>
                ))
              : options.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.retailPrice} ₽)
                  </option>
                ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Кол-во"
            value={line.qty}
            disabled={readOnly}
            autoComplete="off"
            onChange={(e) =>
              onChange(lines.map((l) => (l.id === line.id ? { ...l, qty: e.target.value } : l)))
            }
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Цена"
            value={line.unitPrice}
            disabled={readOnly}
            autoComplete="off"
            onChange={(e) =>
              onChange(
                lines.map((l) => (l.id === line.id ? { ...l, unitPrice: e.target.value } : l))
              )
            }
          />
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn}`}
            aria-label="Удалить строку"
            disabled={readOnly}
            onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
          >
            ×
          </button>
        </div>
      ))}
      {!readOnly ? (
        <button
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${cdProduct.ceilingsSpecificationAddLineBtn}`}
          onClick={() => onChange([...lines, newCeilingsNamedQtyLine()])}
        >
          + Строка
        </button>
      ) : null}
    </>
  );
}
