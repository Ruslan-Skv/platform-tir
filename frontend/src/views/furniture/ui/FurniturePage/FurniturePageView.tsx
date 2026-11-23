'use client';

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

import Link from 'next/link';

import type { FurnitureProduct } from '@/shared/api/furniture';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';

import { FurnitureCalculator } from './FurnitureCalculator';
import { FurnitureCtaBlock } from './FurnitureCtaBlock';
import styles from './FurniturePage.module.css';
import type { FurniturePageModel } from './hooks/useFurniturePage';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

const DEFAULT_COMPARISON_TITLE = 'Сравнение видов мебели';
const DEFAULT_COMPARISON_NOTE =
  'Цены кухонь указаны за погонный метр «под ключ», остальной мебели — за изделие. ' +
  'Точную стоимость дизайнер назовёт после бесплатного замера и 3D-проекта: она зависит от материалов, фурнитуры и наполнения.';

const DEFAULT_MATERIALS_TITLE = 'Материалы и фурнитура';

function formatPriceFrom(product: FurnitureProduct): string | null {
  if (product.priceFrom == null) return null;
  return product.priceUnit === 'пог. м'
    ? `от ${RUBLE_FORMAT.format(product.priceFrom)} ₽/пог. м`
    : `от ${RUBLE_FORMAT.format(product.priceFrom)} ₽`;
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
  product: FurnitureProduct;
  getImageUrl: (url: string | null | undefined) => string;
}) {
  const imageUrl = getImageUrl(product.imageUrl);
  const specs: { label: string; value: string }[] = [
    ...(product.configuration ? [{ label: 'Конфигурация', value: product.configuration }] : []),
    ...(product.facadeMaterial ? [{ label: 'Фасады', value: product.facadeMaterial }] : []),
    ...(product.hardware ? [{ label: 'Фурнитура', value: product.hardware }] : []),
    ...(product.characteristics ?? []),
  ];
  const priceLabel = formatPriceFrom(product);

  return (
    <article className={styles.productCard}>
      <div className={styles.productMedia}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${product.name} — мебель на заказ`} loading="lazy" />
        ) : (
          <div className={styles.productMediaPlaceholder} aria-hidden="true">
            <span className={styles.productMediaName}>{product.name}</span>
            <span className={styles.productMediaSpecs}>
              {product.configuration && <span>{product.configuration}</span>}
              {product.facadeMaterial && <span>{product.facadeMaterial}</span>}
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
              // Подписи могут повторяться (напр., «Конфигурация» и в характеристиках)
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

export function FurniturePageView({ model }: { model: FurniturePageModel }) {
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
    settings.comparisonShowConfiguration !== false && {
      key: 'configuration',
      title: 'Конфигурация',
    },
    settings.comparisonShowFacade !== false && { key: 'facade', title: 'Фасады' },
    settings.comparisonShowHardware !== false && { key: 'hardware', title: 'Фурнитура' },
    settings.comparisonShowPrice !== false && { key: 'price', title: 'Цена' },
  ].filter(Boolean) as { key: string; title: string }[];

  const comparisonCellValue = (product: FurnitureProduct, key: string): string => {
    switch (key) {
      case 'configuration':
        return product.configuration ?? '—';
      case 'facade':
        return product.facadeMaterial ?? '—';
      case 'hardware':
        return product.hardware ?? '—';
      case 'price':
        return formatPriceFrom(product) ?? '—';
      default:
        return '—';
    }
  };

  const steps = settings.steps ?? [];
  const faq = settings.faq ?? [];
  const materials = settings.materials ?? [];

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
                <ClipboardDocumentCheckIcon aria-hidden="true" />
                Бесплатный замер и 3D-проект
              </li>
              <li>
                <WrenchScrewdriverIcon aria-hidden="true" />
                Собственное производство
              </li>
              <li>
                <ClockIcon aria-hidden="true" />
                Изготовление от 14 дней
              </li>
              <li>
                <ShieldCheckIcon aria-hidden="true" />
                Гарантия до 5 лет
              </li>
              <li>
                <CurrencyDollarIcon aria-hidden="true" />
                Рассрочка 0%
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
          <section className={styles.categoriesSection} aria-label="Виды мебели">
            <h2 className={styles.sectionTitle}>Выберите вид мебели</h2>
            <div className={styles.categoryTabs} role="tablist" aria-label="Виды мебели">
              {categories.map((category) => {
                const isActive = activeCategory?.slug === category.slug;
                return (
                  <button
                    key={category.slug}
                    type="button"
                    role="tab"
                    id={`furniture-tab-${category.slug}`}
                    aria-selected={isActive}
                    aria-controls="furniture-category-panel"
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
                id="furniture-category-panel"
                role="tabpanel"
                aria-labelledby={`furniture-tab-${activeCategory.slug}`}
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
                      aria-label={`Изделия: ${activeCategory.name}`}
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
                            {product.configuration && (
                              <span className={styles.productTabType}>{product.configuration}</span>
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
          <section className={styles.comparisonSection} aria-label="Сравнение видов мебели">
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

        {settings.materialsShow !== false && materials.length > 0 && (
          <section className={styles.materialsSection} aria-label="Материалы и фурнитура">
            <h2 className={styles.sectionTitle}>
              {settings.materialsTitle?.trim() || DEFAULT_MATERIALS_TITLE}
            </h2>
            <div className={styles.materialsGrid}>
              {materials.map((material) => (
                <article key={material.name} className={styles.materialCard}>
                  <h3 className={styles.materialName}>{material.name}</h3>
                  <p className={styles.materialDescription}>{material.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {settings.calcShow !== false && categories.length > 0 && (
          <FurnitureCalculator settings={settings} categories={categories} />
        )}

        {steps.length > 0 && <StepsBlock steps={steps} />}

        {faq.length > 0 && <FaqBlock items={faq} />}

        <FurnitureCtaBlock settings={settings} getImageUrl={getImageUrl} />
      </div>
    </div>
  );
}
