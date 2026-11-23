'use client';

import { useMemo, useState } from 'react';

import { useFormContext } from '@/features/forms/context/FormContext';
import type {
  CeilingFabric,
  CeilingManufacturer,
  StretchCeilingsPageSettings,
} from '@/shared/api/stretch-ceilings';
import { Button } from '@/shared/ui/Button/Button';

import styles from './StretchCeilingsPage.module.css';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

function formatRub(value: number): string {
  return `${RUBLE_FORMAT.format(Math.round(value))} ₽`;
}

const SLIDERS = [
  {
    key: 'area',
    label: 'Площадь комнаты',
    unit: 'м²',
    min: 5,
    max: 100,
    step: 1,
    defaultValue: 18,
  },
  {
    key: 'perimeter',
    label: 'Периметр',
    unit: 'м.п.',
    min: 6,
    max: 50,
    step: 1,
    defaultValue: 16,
  },
  {
    key: 'corners',
    label: 'Углы',
    unit: 'шт',
    min: 4,
    max: 16,
    step: 1,
    defaultValue: 4,
  },
  {
    key: 'lights',
    label: 'Светильники',
    unit: 'шт',
    min: 0,
    max: 40,
    step: 1,
    defaultValue: 6,
  },
  {
    key: 'pipes',
    label: 'Обход труб',
    unit: 'шт',
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 0,
  },
] as const;

type SliderKey = (typeof SLIDERS)[number]['key'];

/**
 * Интерактивный калькулятор стоимости натяжного потолка.
 * Цены полотен берутся из активных фактур каталога, наценки — из настроек админки.
 */
export function CeilingCalculator({
  settings,
  manufacturers,
}: {
  settings: StretchCeilingsPageSettings;
  manufacturers: CeilingManufacturer[];
}) {
  const { quoteModal } = useFormContext();

  // Фактуры с ценой — для выбора в калькуляторе
  const pricedFabrics = useMemo(
    () =>
      manufacturers.flatMap((manufacturer) =>
        manufacturer.fabrics
          .filter((fabric) => fabric.priceFrom != null)
          .map((fabric) => ({ fabric, manufacturerName: manufacturer.name }))
      ),
    [manufacturers]
  );

  const [values, setValues] = useState<Record<SliderKey, number>>(
    () =>
      Object.fromEntries(SLIDERS.map((s) => [s.key, s.defaultValue])) as Record<SliderKey, number>
  );
  const [fabricSlug, setFabricSlug] = useState<string | null>(null);
  const [withChandelier, setWithChandelier] = useState(false);
  const [withCornice, setWithCornice] = useState(false);

  const selected = useMemo(() => {
    if (pricedFabrics.length === 0) return null;
    return pricedFabrics.find((item) => item.fabric.slug === fabricSlug) ?? pricedFabrics[0];
  }, [pricedFabrics, fabricSlug]);

  const fabric = selected?.fabric as (CeilingFabric & { priceFrom: number }) | undefined;

  const breakdown = useMemo(() => {
    if (!fabric) return null;
    const canvas = values.area * fabric.priceFrom;
    const baget = values.perimeter * settings.calcPricePerMeterBaget;
    const corners = Math.max(0, values.corners - 4) * settings.calcPricePerCorner;
    const lights = values.lights * settings.calcPricePerLight;
    const pipes = values.pipes * settings.calcPricePerPipe;
    const options =
      (withChandelier ? settings.calcLightOptionPrice : 0) +
      (withCornice ? settings.calcCorniceOptionPrice : 0);
    const raw = canvas + baget + corners + lights + pipes + options;
    const total = Math.max(raw, settings.calcMinOrder);
    return {
      canvas,
      baget,
      corners,
      lights,
      pipes,
      options,
      raw,
      total,
      minApplied: raw < settings.calcMinOrder,
    };
  }, [fabric, values, settings, withChandelier, withCornice]);

  if (pricedFabrics.length === 0 || !fabric || !breakdown) return null;

  const sliderValue = (key: SliderKey, raw: string): number => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return values[key];
    const config = SLIDERS.find((s) => s.key === key)!;
    return Math.min(config.max, Math.max(config.min, parsed));
  };

  return (
    <section className={styles.calcSection} aria-label="Калькулятор стоимости потолка">
      <h2 className={styles.sectionTitle}>
        {settings.calcTitle?.trim() || 'Калькулятор стоимости потолка'}
      </h2>

      <div className={styles.calcGrid}>
        <div className={styles.calcControls}>
          <fieldset className={styles.calcFieldset}>
            <legend className={styles.calcLegend}>Параметры комнаты</legend>
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
          </fieldset>

          <fieldset className={styles.calcFieldset}>
            <legend className={styles.calcLegend}>Опции</legend>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withChandelier}
                onChange={(event) => setWithChandelier(event.target.checked)}
              />
              Монтаж люстры — {formatRub(settings.calcLightOptionPrice)}
            </label>
            <label className={styles.calcCheckbox}>
              <input
                type="checkbox"
                checked={withCornice}
                onChange={(event) => setWithCornice(event.target.checked)}
              />
              Закладная под карниз — {formatRub(settings.calcCorniceOptionPrice)}
            </label>
          </fieldset>
        </div>

        <div className={styles.calcResult}>
          <h3 className={styles.calcResultTitle}>Предварительная стоимость</h3>

          <div className={styles.calcFabrics} role="radiogroup" aria-label="Фактура полотна">
            {pricedFabrics.map(({ fabric: item, manufacturerName }) => {
              const isActive = item.slug === fabric.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  data-active={isActive || undefined}
                  className={styles.calcFabricOption}
                  onClick={() => setFabricSlug(item.slug)}
                >
                  <span className={styles.calcFabricName}>
                    {item.name}
                    <span className={styles.calcFabricManufacturer}>{manufacturerName}</span>
                  </span>
                  <span className={styles.calcFabricPrice}>от {item.priceFrom} ₽/м²</span>
                </button>
              );
            })}
          </div>

          <dl className={styles.calcBreakdown}>
            <div>
              <dt>
                Полотно {fabric.name} × {values.area} м²
              </dt>
              <dd>{formatRub(breakdown.canvas)}</dd>
            </div>
            <div>
              <dt>Багет × {values.perimeter} м.п.</dt>
              <dd>{formatRub(breakdown.baget)}</dd>
            </div>
            {values.corners > 4 && (
              <div>
                <dt>Доп. углы × {values.corners - 4}</dt>
                <dd>{formatRub(breakdown.corners)}</dd>
              </div>
            )}
            {values.lights > 0 && (
              <div>
                <dt>Светильники × {values.lights}</dt>
                <dd>{formatRub(breakdown.lights)}</dd>
              </div>
            )}
            {values.pipes > 0 && (
              <div>
                <dt>Обход труб × {values.pipes}</dt>
                <dd>{formatRub(breakdown.pipes)}</dd>
              </div>
            )}
            {breakdown.options > 0 && (
              <div>
                <dt>Опции (люстра, карниз)</dt>
                <dd>{formatRub(breakdown.options)}</dd>
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
              'Расчёт предварительный: точную смету составит замерщик после бесплатного выезда.'}
          </p>
        </div>
      </div>
    </section>
  );
}
