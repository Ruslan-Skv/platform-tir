'use client';

import { useMemo, useState } from 'react';

import { useFormContext } from '@/features/forms/context/FormContext';
import type { BlindsCategory, BlindsPageSettings, BlindsProduct } from '@/shared/api/blinds';
import { Button } from '@/shared/ui/Button/Button';

import styles from './BlindsPage.module.css';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

function formatRub(value: number): string {
  return `${RUBLE_FORMAT.format(Math.round(value))} ₽`;
}

const SLIDERS = [
  {
    key: 'width',
    label: 'Ширина изделия',
    unit: 'см',
    min: 40,
    max: 300,
    step: 5,
    defaultValue: 130,
  },
  {
    key: 'height',
    label: 'Высота изделия',
    unit: 'см',
    min: 40,
    max: 300,
    step: 5,
    defaultValue: 140,
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
 * Интерактивный калькулятор стоимости жалюзи.
 * Цены изделий берутся из активных систем каталога, наценки — из настроек админки.
 */
export function BlindsCalculator({
  settings,
  categories,
}: {
  settings: BlindsPageSettings;
  categories: BlindsCategory[];
}) {
  const { quoteModal } = useFormContext();

  // Изделия с ценой — для выбора в калькуляторе
  const pricedProducts = useMemo(
    () =>
      categories.flatMap((category) =>
        category.products
          .filter((product) => product.priceFrom != null)
          .map((product) => ({ product, categoryName: category.name }))
      ),
    [categories]
  );

  const [values, setValues] = useState<Record<SliderKey, number>>(
    () =>
      Object.fromEntries(SLIDERS.map((s) => [s.key, s.defaultValue])) as Record<SliderKey, number>
  );
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [withMount, setWithMount] = useState(false);
  const [withMotor, setWithMotor] = useState(false);
  const [withNoDrill, setWithNoDrill] = useState(false);

  const selected = useMemo(() => {
    if (pricedProducts.length === 0) return null;
    return pricedProducts.find((item) => item.product.slug === productSlug) ?? pricedProducts[0];
  }, [pricedProducts, productSlug]);

  const product = selected?.product as (BlindsProduct & { priceFrom: number }) | undefined;

  // Площадь одного изделия в м² (округляем вверх до 0,1 м² — как считают производства)
  const areaM2 = useMemo(
    () => Math.ceil((values.width / 100) * (values.height / 100) * 10) / 10,
    [values.width, values.height]
  );

  const breakdown = useMemo(() => {
    if (!product) return null;
    const canvas = areaM2 * product.priceFrom;
    const optionsPerItem =
      (withMount ? settings.calcMountPrice : 0) +
      (withMotor ? settings.calcMotorPrice : 0) +
      (withNoDrill ? settings.calcNoDrillPrice : 0);
    const perItem = canvas + optionsPerItem;
    const raw = perItem * values.qty;
    const total = Math.max(raw, settings.calcMinOrder);
    return {
      canvas,
      optionsPerItem,
      raw,
      total,
      minApplied: raw < settings.calcMinOrder,
    };
  }, [product, areaM2, values.qty, settings, withMount, withMotor, withNoDrill]);

  if (pricedProducts.length === 0 || !product || !breakdown) return null;

  const sliderValue = (key: SliderKey, raw: string): number => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return values[key];
    const config = SLIDERS.find((s) => s.key === key)!;
    return Math.min(config.max, Math.max(config.min, parsed));
  };

  return (
    <section className={styles.calcSection} aria-label="Калькулятор стоимости жалюзи">
      <h2 className={styles.sectionTitle}>
        {settings.calcTitle?.trim() || 'Калькулятор стоимости жалюзи'}
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
            <p className={styles.calcNote}>
              Площадь одного изделия: {areaM2.toFixed(1)} м² ({values.width} × {values.height} см)
            </p>
          </fieldset>

          <fieldset className={styles.calcFieldset}>
            <legend className={styles.calcLegend}>Опции</legend>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withMount}
                onChange={(event) => setWithMount(event.target.checked)}
              />
              Монтаж изделия — {formatRub(settings.calcMountPrice)}
            </label>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withMotor}
                onChange={(event) => setWithMotor(event.target.checked)}
              />
              Электропривод — {formatRub(settings.calcMotorPrice)}
            </label>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withNoDrill}
                onChange={(event) => setWithNoDrill(event.target.checked)}
              />
              Крепление без сверления — {formatRub(settings.calcNoDrillPrice)}
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
                  <span className={styles.calcProductPrice}>от {item.priceFrom} ₽/м²</span>
                </button>
              );
            })}
          </div>

          <dl className={styles.calcBreakdown}>
            <div>
              <dt>
                {product.name} × {areaM2.toFixed(1)} м²
              </dt>
              <dd>{formatRub(breakdown.canvas)}</dd>
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
            <span>Итого «под ключ»</span>
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
              'Расчёт предварительный: точную смету составит мастер после бесплатного замера.'}
          </p>
        </div>
      </div>
    </section>
  );
}
