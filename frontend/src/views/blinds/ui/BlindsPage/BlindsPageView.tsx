'use client';

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

import Link from 'next/link';

import type { BlindsProduct } from '@/shared/api/blinds';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';

import { BlindsCalculator } from './BlindsCalculator';
import { BlindsCtaBlock } from './BlindsCtaBlock';
import styles from './BlindsPage.module.css';
import type { BlindsPageModel } from './hooks/useBlindsPage';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

const DEFAULT_COMPARISON_TITLE = 'Сравнение систем жалюзи';
const DEFAULT_COMPARISON_NOTE =
  'Цены указаны за квадратный метр изделия «под ключ» с изготовлением и монтажом. ' +
  'Характеристики приведены по данным производителей — подберём систему под ваше окно на бесплатном замере.';

function formatPriceFromM2(priceFrom: number | null): string | null {
  if (priceFrom == null) return null;
  return `от ${RUBLE_FORMAT.format(priceFrom)} ₽/м²`;
}

function pluralProducts(count: number): string {
  if (count === 1) return 'изделие';
  if (count > 1 && count < 5) return 'изделия';
  return 'изделий';
}

/** Карточка выбранного изделия. */
function ProductCard({
  product,
  getImageUrl,
}: {
  product: BlindsProduct;
  getImageUrl: (url: string | null | undefined) => string;
}) {
  const imageUrl = getImageUrl(product.imageUrl);
  const specs: { label: string; value: string }[] = [
    ...(product.mountType ? [{ label: 'Установка', value: product.mountType }] : []),
    ...(product.material ? [{ label: 'Материал', value: product.material }] : []),
    ...(product.controlType ? [{ label: 'Управление', value: product.controlType }] : []),
    ...(product.characteristics ?? []),
  ];
  const priceLabel = formatPriceFromM2(product.priceFrom);

  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${product.name} — система жалюзи`} loading="lazy" />
        ) : (
          <div className={styles.productMediaPlaceholder} aria-hidden="true">
            <span className={styles.productMediaName}>{product.name}</span>
            <span className={styles.productMediaSpecs}>
              {product.mountType && <span>{product.mountType}</span>}
              {product.material && <span>{product.material}</span>}
            </span>
          </div>
        )}
        {product.badge && <span className={styles.badge}>{product.badge}</span>}
      </div>

      <div className={styles.productBody}>
        <h3 className={styles.productName}>{product.name}</h3>
        {product.tagline && <p className={styles.productTagline}>{product.tagline}</p>}
        <p className={styles.productDescription}>{product.description}</p>

        {specs.length > 0 && (
          <dl className={styles.specsList}>
            {specs.map((spec, index) => (
              // Подписи могут повторяться (напр., «Установка» и в способе установки, и в характеристиках)
              <div key={`${spec.label}-${index}`} className={styles.specsRow}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {product.advantages.length > 0 && (
          <ul className={styles.advantages}>
            {product.advantages.map((advantage) => (
              <li key={advantage}>
                <CheckIcon className={styles.advantageIcon} aria-hidden="true" />
                {advantage}
              </li>
            ))}
          </ul>
        )}

        {product.videoUrl && (
          <div className={styles.productVideo}>
            <VideoPlayer lazy url={product.videoUrl} title={`${product.name} — видео`} />
          </div>
        )}

        {priceLabel && (
          <div className={styles.productFooter}>
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

export function BlindsPageView({ model }: { model: BlindsPageModel }) {
  const {
    settings,
    categories,
    activeCategory,
    activeProduct,
    selectCategory,
    selectProduct,
    getImageUrl,
  } = model;

  const comparisonRows = categories.flatMap((category) =>
    category.products.map((product) => ({ category, product }))
  );

  const comparisonColumns = [
    settings.comparisonShowMount !== false && { key: 'mount', title: 'Установка' },
    settings.comparisonShowMaterial !== false && { key: 'material', title: 'Материал' },
    settings.comparisonShowControl !== false && { key: 'control', title: 'Управление' },
    settings.comparisonShowPrice !== false && { key: 'price', title: 'Цена за м²' },
  ].filter(Boolean) as { key: string; title: string }[];

  const comparisonCellValue = (product: BlindsProduct, key: string): string => {
    switch (key) {
      case 'mount':
        return product.mountType ?? '—';
      case 'material':
        return product.material ?? '—';
      case 'control':
        return product.controlType ?? '—';
      case 'price':
        return product.priceFrom != null ? `от ${RUBLE_FORMAT.format(product.priceFrom)} ₽` : '—';
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
                <ClockIcon aria-hidden="true" />
                Изготовление от 2 дней
              </li>
              <li>
                <WrenchScrewdriverIcon aria-hidden="true" />
                Монтаж за один визит
              </li>
              <li>
                <ShieldCheckIcon aria-hidden="true" />
                Гарантия до 3 лет
              </li>
              <li>
                <CurrencyDollarIcon aria-hidden="true" />
                Фиксация цены в договоре
              </li>
            </ul>
          </div>
          {settings.heroImageUrl && (
            <div className={styles.heroImage}>
              <img src={getImageUrl(settings.heroImageUrl)} alt={settings.title} loading="eager" />
            </div>
          )}
        </section>

        {categories.length > 0 && (
          <section className={styles.categoriesSection} aria-label="Типы изделий">
            <h2 className={styles.sectionTitle}>Выберите тип изделий</h2>
            <div className={styles.categoryTabs} role="tablist" aria-label="Типы изделий">
              {categories.map((category) => {
                const isActive = activeCategory?.slug === category.slug;
                return (
                  <button
                    key={category.slug}
                    type="button"
                    role="tab"
                    id={`blinds-tab-${category.slug}`}
                    aria-selected={isActive}
                    aria-controls="blinds-category-panel"
                    data-active={isActive || undefined}
                    className={styles.categoryTab}
                    onClick={() => selectCategory(category.slug)}
                  >
                    <span>{category.name}</span>
                    <span className={styles.categoryTabCount}>
                      {category.products.length} {pluralProducts(category.products.length)}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeCategory && (
              <div
                id="blinds-category-panel"
                role="tabpanel"
                aria-labelledby={`blinds-tab-${activeCategory.slug}`}
                className={styles.categoryPanel}
              >
                <div className={styles.categoryHeader}>
                  <h3 className={styles.categoryName}>{activeCategory.name}</h3>
                  {activeCategory.description && (
                    <p className={styles.categoryDescription}>{activeCategory.description}</p>
                  )}
                </div>

                {activeCategory.products.length > 0 ? (
                  <>
                    <div
                      className={styles.productTabs}
                      role="tablist"
                      aria-label={`Системы: ${activeCategory.name}`}
                    >
                      {activeCategory.products.map((product) => {
                        const isActive = activeProduct?.slug === product.slug;
                        return (
                          <button
                            key={product.slug}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            data-active={isActive || undefined}
                            className={styles.productTab}
                            onClick={() => selectProduct(product.slug)}
                          >
                            {product.mountType && (
                              <span className={styles.productTabType}>{product.mountType}</span>
                            )}
                            <span>{product.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {activeProduct && (
                      <ProductCard
                        key={activeProduct.slug}
                        product={activeProduct}
                        getImageUrl={getImageUrl}
                      />
                    )}
                  </>
                ) : (
                  <p className={styles.emptyProducts}>Изделия этой категории скоро появятся.</p>
                )}
              </div>
            )}
          </section>
        )}

        {settings.comparisonShow !== false && comparisonRows.length > 0 && (
          <section className={styles.comparisonSection} aria-label="Сравнение систем">
            <h2 className={styles.sectionTitle}>
              {settings.comparisonTitle?.trim() || DEFAULT_COMPARISON_TITLE}
            </h2>
            <div className={styles.tableScroll}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th scope="col">Изделие</th>
                    {comparisonColumns.map((column) => (
                      <th key={column.key} scope="col">
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(({ category, product }) => (
                    <tr key={product.slug}>
                      <th scope="row">
                        <span className={styles.comparisonCategory}>{category.name}</span>
                        {product.name}
                      </th>
                      {comparisonColumns.map((column) => (
                        <td key={column.key}>{comparisonCellValue(product, column.key)}</td>
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

        {settings.calcShow !== false && categories.length > 0 && (
          <BlindsCalculator settings={settings} categories={categories} />
        )}

        {steps.length > 0 && <StepsBlock steps={steps} />}

        {faq.length > 0 && <FaqBlock items={faq} />}

        <BlindsCtaBlock settings={settings} getImageUrl={getImageUrl} />
      </div>
    </div>
  );
}
