'use client';

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

import Link from 'next/link';

import type { CeilingFabric } from '@/shared/api/stretch-ceilings';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';

import { CeilingCalculator } from './CeilingCalculator';
import { StretchCeilingsCtaBlock } from './StretchCeilingsCtaBlock';
import styles from './StretchCeilingsPage.module.css';
import type { StretchCeilingsPageModel } from './hooks/useStretchCeilingsPage';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

const DEFAULT_COMPARISON_TITLE = 'Сравнение фактур полотен';
const DEFAULT_COMPARISON_NOTE =
  'Цены указаны за квадратный метр полотна «под ключ» с монтажом. Характеристики приведены по ' +
  'данным производителей — подберём фактуру под ваше помещение на бесплатном замере.';

function formatPriceFromM2(priceFrom: number | null): string | null {
  if (priceFrom == null) return null;
  return `от ${RUBLE_FORMAT.format(priceFrom)} ₽/м²`;
}

/** Карточка выбранной фактуры полотна. */
function FabricCard({
  fabric,
  getImageUrl,
}: {
  fabric: CeilingFabric;
  getImageUrl: (url: string | null | undefined) => string;
}) {
  const imageUrl = getImageUrl(fabric.imageUrl);
  const specs: { label: string; value: string }[] = [
    ...(fabric.textureType ? [{ label: 'Тип фактуры', value: fabric.textureType }] : []),
    ...(fabric.width ? [{ label: 'Ширина полотна', value: fabric.width }] : []),
    ...(fabric.characteristics ?? []),
  ];
  const priceLabel = formatPriceFromM2(fabric.priceFrom);

  return (
    <article className={styles.fabricCard}>
      <div className={styles.fabricMedia}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${fabric.name} — фактура полотна`} loading="lazy" />
        ) : (
          <div className={styles.fabricMediaPlaceholder} aria-hidden="true">
            <span className={styles.fabricMediaName}>{fabric.name}</span>
            <span className={styles.fabricMediaSpecs}>
              {fabric.textureType && <span>{fabric.textureType}</span>}
              {fabric.width && <span>{fabric.width}</span>}
            </span>
          </div>
        )}
        {fabric.badge && <span className={styles.badge}>{fabric.badge}</span>}
      </div>

      <div className={styles.fabricBody}>
        <h3 className={styles.fabricName}>{fabric.name}</h3>
        {fabric.tagline && <p className={styles.fabricTagline}>{fabric.tagline}</p>}
        <p className={styles.fabricDescription}>{fabric.description}</p>

        {specs.length > 0 && (
          <dl className={styles.specsList}>
            {specs.map((spec) => (
              <div key={spec.label} className={styles.specsRow}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {fabric.advantages.length > 0 && (
          <ul className={styles.advantages}>
            {fabric.advantages.map((advantage) => (
              <li key={advantage}>
                <CheckIcon className={styles.advantageIcon} aria-hidden="true" />
                {advantage}
              </li>
            ))}
          </ul>
        )}

        {fabric.videoUrl && (
          <div className={styles.fabricVideo}>
            <VideoPlayer lazy url={fabric.videoUrl} title={`${fabric.name} — видео`} />
          </div>
        )}

        {priceLabel && (
          <div className={styles.fabricFooter}>
            <span className={styles.priceFrom}>{priceLabel}</span>
          </div>
        )}
      </div>
    </article>
  );
}

/** Этапы работы. */
function StepsBlock({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <section className={styles.stepsSection} aria-label="Этапы работы">
      <h2 className={styles.sectionTitle}>Как мы работаем</h2>
      <ol className={styles.stepsList}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.stepItem}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** FAQ-аккордеон. */
function FaqBlock({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <section className={styles.faqSection} aria-label="Частые вопросы">
      <h2 className={styles.sectionTitle}>Частые вопросы</h2>
      <div className={styles.faqList}>
        {items.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>{item.question}</span>
              <ChevronDownIcon className={styles.faqChevron} aria-hidden="true" />
            </summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function StretchCeilingsPageView({ model }: { model: StretchCeilingsPageModel }) {
  const {
    settings,
    manufacturers,
    activeManufacturer,
    activeFabric,
    selectManufacturer,
    selectFabric,
    getImageUrl,
  } = model;

  const comparisonRows = manufacturers.flatMap((manufacturer) =>
    manufacturer.fabrics.map((fabric) => ({ manufacturer, fabric }))
  );

  const comparisonColumns = [
    settings.comparisonShowTexture !== false && { key: 'texture', title: 'Фактура' },
    settings.comparisonShowWidth !== false && { key: 'width', title: 'Ширина' },
    settings.comparisonShowPrice !== false && { key: 'price', title: 'Цена за м²' },
    settings.comparisonShowCountry !== false && { key: 'country', title: 'Производитель' },
  ].filter(Boolean) as { key: string; title: string }[];

  const comparisonCellValue = (
    manufacturer: { country: string | null },
    fabric: CeilingFabric,
    key: string
  ): string => {
    switch (key) {
      case 'texture':
        return fabric.textureType ?? '—';
      case 'width':
        return fabric.width ?? '—';
      case 'price':
        return fabric.priceFrom != null ? `от ${RUBLE_FORMAT.format(fabric.priceFrom)} ₽` : '—';
      case 'country':
        return manufacturer.country ?? '—';
      default:
        return '—';
    }
  };

  const steps = settings.steps ?? [];
  const faq = settings.faq ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <ChevronRightIcon aria-hidden="true" />
          <span aria-current="page">{settings.title}</span>
        </nav>

        <h1 className={styles.pageTitle}>{settings.title}</h1>

        <section className={styles.hero}>
          <div className={styles.heroText}>
            {settings.subtitle && <p className={styles.heroSubtitle}>{settings.subtitle}</p>}
            {settings.description && (
              <p className={styles.heroDescription}>{settings.description}</p>
            )}
            <ul className={styles.heroNotes}>
              <li>
                <ClockIcon aria-hidden="true" />
                Бесплатный замер
              </li>
              <li>
                <TruckIcon aria-hidden="true" />
                Монтаж за 1 день
              </li>
              <li>
                <ShieldCheckIcon aria-hidden="true" />
                Гарантия до 15 лет
              </li>
              <li>
                <CurrencyDollarIcon aria-hidden="true" />
                Без предоплаты
              </li>
            </ul>
          </div>
          {settings.heroImageUrl && (
            <div className={styles.heroImage}>
              <img src={getImageUrl(settings.heroImageUrl)} alt={settings.title} loading="eager" />
            </div>
          )}
        </section>

        {manufacturers.length > 0 && (
          <section className={styles.manufacturersSection} aria-label="Фактуры полотен">
            <h2 className={styles.sectionTitle}>Выберите производителя полотна</h2>
            <div
              className={styles.manufacturerTabs}
              role="tablist"
              aria-label="Производители полотен"
            >
              {manufacturers.map((manufacturer) => {
                const isActive = activeManufacturer?.slug === manufacturer.slug;
                return (
                  <button
                    key={manufacturer.slug}
                    type="button"
                    role="tab"
                    id={`ceilings-tab-${manufacturer.slug}`}
                    aria-selected={isActive}
                    aria-controls="ceilings-manufacturer-panel"
                    data-active={isActive || undefined}
                    className={styles.manufacturerTab}
                    onClick={() => selectManufacturer(manufacturer.slug)}
                  >
                    {manufacturer.logoUrl && (
                      <img
                        src={getImageUrl(manufacturer.logoUrl)}
                        alt=""
                        loading="lazy"
                        className={styles.manufacturerTabLogo}
                      />
                    )}
                    <span>{manufacturer.name}</span>
                    <span className={styles.manufacturerTabCount}>
                      {manufacturer.fabrics.length}{' '}
                      {manufacturer.fabrics.length === 1
                        ? 'фактура'
                        : manufacturer.fabrics.length < 5
                          ? 'фактуры'
                          : 'фактур'}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeManufacturer && (
              <div
                id="ceilings-manufacturer-panel"
                role="tabpanel"
                aria-labelledby={`ceilings-tab-${activeManufacturer.slug}`}
                className={styles.manufacturerPanel}
              >
                <div className={styles.manufacturerHeader}>
                  <h3 className={styles.manufacturerName}>{activeManufacturer.name}</h3>
                  {activeManufacturer.country && (
                    <span className={styles.manufacturerCountry}>{activeManufacturer.country}</span>
                  )}
                  {activeManufacturer.description && (
                    <p className={styles.manufacturerDescription}>
                      {activeManufacturer.description}
                    </p>
                  )}
                </div>

                {activeManufacturer.fabrics.length > 0 ? (
                  <>
                    <div
                      className={styles.fabricTabs}
                      role="tablist"
                      aria-label={`Фактуры ${activeManufacturer.name}`}
                    >
                      {activeManufacturer.fabrics.map((fabric) => {
                        const isActive = activeFabric?.slug === fabric.slug;
                        return (
                          <button
                            key={fabric.slug}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            data-active={isActive || undefined}
                            className={styles.fabricTab}
                            onClick={() => selectFabric(fabric.slug)}
                          >
                            {fabric.textureType && (
                              <span className={styles.fabricTabType}>{fabric.textureType}</span>
                            )}
                            <span>{fabric.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {activeFabric && (
                      <FabricCard
                        key={activeFabric.slug}
                        fabric={activeFabric}
                        getImageUrl={getImageUrl}
                      />
                    )}
                  </>
                ) : (
                  <p className={styles.emptyFabrics}>Фактуры этого производителя скоро появятся.</p>
                )}
              </div>
            )}
          </section>
        )}

        {settings.comparisonShow !== false && comparisonRows.length > 0 && (
          <section className={styles.comparisonSection} aria-label="Сравнение фактур">
            <h2 className={styles.sectionTitle}>
              {settings.comparisonTitle?.trim() || DEFAULT_COMPARISON_TITLE}
            </h2>
            <div className={styles.tableScroll}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th scope="col">Полотно</th>
                    {comparisonColumns.map((column) => (
                      <th key={column.key} scope="col">
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(({ manufacturer, fabric }) => (
                    <tr key={fabric.slug}>
                      <th scope="row">
                        <span className={styles.comparisonManufacturer}>{manufacturer.name}</span>
                        {fabric.name}
                      </th>
                      {comparisonColumns.map((column) => (
                        <td key={column.key}>
                          {comparisonCellValue(manufacturer, fabric, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {settings.comparisonNote?.trim() ? (
              <p className={styles.comparisonNote}>{settings.comparisonNote.trim()}</p>
            ) : settings.comparisonNote === null ? (
              <p className={styles.comparisonNote}>{DEFAULT_COMPARISON_NOTE}</p>
            ) : null}
          </section>
        )}

        {settings.calcShow !== false && manufacturers.length > 0 && (
          <CeilingCalculator settings={settings} manufacturers={manufacturers} />
        )}

        {steps.length > 0 && <StepsBlock steps={steps} />}

        {faq.length > 0 && <FaqBlock items={faq} />}

        <StretchCeilingsCtaBlock settings={settings} getImageUrl={getImageUrl} />
      </div>
    </div>
  );
}
