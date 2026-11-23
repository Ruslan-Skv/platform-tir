'use client';

import { useMemo, useState } from 'react';

import { useFormContext } from '@/features/forms/context/FormContext';
import type {
  FurnitureCategory,
  FurniturePageSettings,
  FurnitureProduct,
} from '@/shared/api/furniture';
import { Button } from '@/shared/ui/Button/Button';

import styles from './FurniturePage.module.css';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

function formatRub(value: number): string {
  return `${RUBLE_FORMAT.format(Math.round(value))} ₽`;
}

function formatPriceFrom(product: FurnitureProduct & { priceFrom: number }): string {
  return product.priceUnit === 'пог. м'
    ? `от ${RUBLE_FORMAT.format(product.priceFrom)} ₽/пог. м`
    : `от ${RUBLE_FORMAT.format(product.priceFrom)} ₽`;
}

const SLIDERS = [
  {
    key: 'length',
    label: 'Длина комплекта',
    unit: 'пог. м',
    min: 1,
    max: 6,
    step: 0.1,
    defaultValue: 2.4,
  },
  {
    key: 'qty',
    label: 'Количество изделий',
    unit: 'шт',
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 1,
  },
] as const;

type SliderKey = (typeof SLIDERS)[number]['key'];

/**
 * Интерактивный калькулятор стоимости мебели.
 * Цены изделий берутся из активных позиций каталога: кухни — за погонный метр,
 * остальная мебель — за изделие. Наценки — из настроек админки.
 */
export function FurnitureCalculator({
  settings,
  categories,
}: {
  settings: FurniturePageSettings;
  categories: FurnitureCategory[];
}) {
  const { quoteModal } = useFormContext();

  // Изделия с ценой — для выбора в калькуляторе («пог. м» и «за изделие»;
  // позиции за м² считаются индивидуально и в калькулятор не попадают)
  const pricedProducts = useMemo(
    () =>
      categories.flatMap((category) =>
        category.products
          .filter((product) => product.priceFrom != null && (product.priceUnit ?? '') !== 'м²')
          .map((product) => ({ product, categoryName: category.name }))
      ),
    [categories]
  );

  const [values, setValues] = useState<Record<SliderKey, number>>(
    () =>
      Object.fromEntries(SLIDERS.map((s) => [s.key, s.defaultValue])) as Record<SliderKey, number>
  );
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [withAssembly, setWithAssembly] = useState(false);
  const [withDelivery, setWithDelivery] = useState(false);
  const [withPremiumHardware, setWithPremiumHardware] = useState(false);

  const selected = useMemo(() => {
    if (pricedProducts.length === 0) return null;
    return pricedProducts.find((item) => item.product.slug === productSlug) ?? pricedProducts[0];
  }, [pricedProducts, productSlug]);

  const product = selected?.product as (FurnitureProduct & { priceFrom: number }) | undefined;
  const isPerMeter = product?.priceUnit === 'пог. м';

  const breakdown = useMemo(() => {
    if (!product) return null;
    const base = isPerMeter ? product.priceFrom * values.length : product.priceFrom;
    const optionsPerItem =
      (withAssembly ? settings.calcAssemblyPrice : 0) +
      (withDelivery ? settings.calcDeliveryPrice : 0) +
      (withPremiumHardware ? settings.calcPremiumHardwarePrice : 0);
    const perItem = base + optionsPerItem;
    const raw = perItem * values.qty;
    const total = Math.max(raw, settings.calcMinOrder);
    return {
      base,
      optionsPerItem,
      raw,
      total,
      minApplied: raw < settings.calcMinOrder,
    };
  }, [
    product,
    isPerMeter,
    values.length,
    values.qty,
    settings,
    withAssembly,
    withDelivery,
    withPremiumHardware,
  ]);

  if (pricedProducts.length === 0 || !product || !breakdown) return null;

  const sliderValue = (key: SliderKey, raw: string): number => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return values[key];
    const config = SLIDERS.find((s) => s.key === key)!;
    return Math.min(config.max, Math.max(config.min, parsed));
  };

  return (
    <section className={styles.calcSection} aria-label="Калькулятор стоимости мебели">
      <h2 className={styles.sectionTitle}>
        {settings.calcTitle?.trim() || 'Калькулятор стоимости мебели'}
      </h2>

      <div className={styles.calcGrid}>
        <div className={styles.calcControls}>
          <fieldset className={styles.calcFieldset}>
            <legend className={styles.calcLegend}>Размеры и количество</legend>
            {SLIDERS.map((slider) => (
              <label key={slider.key} className={styles.calcSlider}>
                <span className={styles.calcSliderLabel}>
                  {slider.label}
                  <output className={styles.calcSliderValue}>
                    {values[slider.key]} {slider.unit}
                  </output>
                </span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={values[slider.key]}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [slider.key]: sliderValue(slider.key, event.target.value),
                    }))
                  }
                />
              </label>
            ))}
            <p className={styles.calcSliderNote}>
              {isPerMeter
                ? `Цена «${product.name}» — за погонный метр: ${values.length} пог. м × ${RUBLE_FORMAT.format(product.priceFrom)} ₽`
                : `«${product.name}» рассчитывается за изделие целиком — длина не влияет на цену`}
            </p>
          </fieldset>

          <fieldset className={styles.calcFieldset}>
            <legend className={styles.calcLegend}>Опции</legend>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withAssembly}
                onChange={(event) => setWithAssembly(event.target.checked)}
              />
              Сборка и установка — {formatRub(settings.calcAssemblyPrice)}
            </label>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withDelivery}
                onChange={(event) => setWithDelivery(event.target.checked)}
              />
              Доставка — {formatRub(settings.calcDeliveryPrice)}
            </label>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withPremiumHardware}
                onChange={(event) => setWithPremiumHardware(event.target.checked)}
              />
              Премиум-фурнитура (Blum / Hettich) — {formatRub(settings.calcPremiumHardwarePrice)}
            </label>
          </fieldset>
        </div>

        <div className={styles.calcResult}>
          <h3 className={styles.calcResultTitle}>Предварительная стоимость</h3>

          <div className={styles.calcProducts} role="radiogroup" aria-label="Тип изделия">
            {pricedProducts.map(({ product: item, categoryName }) => {
              const isActive = item.slug === product.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  data-active={isActive || undefined}
                  className={styles.calcProductOption}
                  onClick={() => setProductSlug(item.slug)}
                >
                  <span className={styles.calcProductName}>
                    {item.name}
                    <span className={styles.calcProductCategory}>{categoryName}</span>
                  </span>
                  <span className={styles.calcProductPrice}>
                    {formatPriceFrom(item as FurnitureProduct & { priceFrom: number })}
                  </span>
                </button>
              );
            })}
          </div>

          <dl className={styles.calcBreakdown}>
            <div>
              <dt>{isPerMeter ? `${product.name} × ${values.length} пог. м` : product.name}</dt>
              <dd>{formatRub(breakdown.base)}</dd>
            </div>
            {breakdown.optionsPerItem > 0 && (
              <div>
                <dt>Опции (за изделие)</dt>
                <dd>{formatRub(breakdown.optionsPerItem)}</dd>
              </div>
            )}
            {values.qty > 1 && (
              <div>
                <dt>Количество изделий × {values.qty}</dt>
                <dd>{formatRub(breakdown.raw)}</dd>
              </div>
            )}
          </dl>

          <div className={styles.calcTotal}>
            <span>Итого, предварительно</span>
            <strong>{formatRub(breakdown.total)}</strong>
          </div>
          {breakdown.minApplied && (
            <p className={styles.calcMinNote}>
              В расчёт применён минимальный заказ {formatRub(settings.calcMinOrder)}.
            </p>
          )}

          <Button variant="primary" onClick={quoteModal.open} data-action-button="calc-quote">
            Получить точный расчёт
          </Button>
          <p className={styles.calcNote}>
            {settings.calcNote?.trim() ||
              'Расчёт предварительный: точную смету составит дизайнер после бесплатного замера и 3D-проекта.'}
          </p>
        </div>
      </div>
    </section>
  );
}
