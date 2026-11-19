'use client';

import { ArrowRightIcon, CheckBadgeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import Link from 'next/link';

import type {
  ServiceCatalogCategory,
  ServiceCatalogHeroNote,
  ServiceCatalogStep,
} from '@/shared/api/service-catalog';
import { getSafeHref } from '@/shared/lib/sanitize';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';

import { ServiceCatalogCtaBlock } from './ServiceCatalogCtaBlock';
import styles from './ServiceCatalogPage.module.css';
import type { ServiceCatalogPageModel } from './hooks/useServiceCatalogPage';

type ServiceCatalogPageViewProps = {
  model: ServiceCatalogPageModel;
};

/** Дефолтный подзаголовок hero-блока — пока не заполнен в админке. */
const DEFAULT_HERO_SUBTITLE = 'Виды работ с ценами: от демонтажа до чистовой отделки';

/** Дефолтное описание hero-блока — пока не заполнено в админке. */
const DEFAULT_HERO_DESCRIPTION =
  'Каталог работ по ремонту квартир и помещений: подготовка поверхностей, малярные и сантехнические работы, электрика, полы и кафель. ' +
  'Составим смету под ваш объект и зафиксируем стоимость в договоре.';

/** Дефолтные преимущества hero-блока — пока не заполнены в админке. */
const DEFAULT_HERO_NOTES: ServiceCatalogHeroNote[] = [
  { icon: 'ClipboardDocumentList', text: 'Смета до начала работ' },
  { icon: 'Banknotes', text: 'Фиксированные цены в договоре' },
  { icon: 'ShieldCheck', text: 'Гарантия на работы' },
];

const DEFAULT_STEPS_TITLE = 'Этапы работы';

/** Дефолтные этапы работы — пока не заполнены в админке. */
const DEFAULT_STEPS: ServiceCatalogStep[] = [
  {
    title: 'Заявка',
    description: 'Оставьте заявку или позвоните — уточним задачу и подскажем состав работ.',
  },
  {
    title: 'Замер и смета',
    description: 'Мастер выезжает на объект и составляет смету по каталогу видов работ.',
  },
  {
    title: 'Договор',
    description: 'Фиксируем перечень работ, сроки и стоимость — цены не меняются в процессе.',
  },
  {
    title: 'Выполнение',
    description: 'Выполняем работы поэтапно, вы принимаете результат и получаете гарантию.',
  },
];

function pluralizeWorkTypes(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'вид работ';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'вида работ';
  return 'видов работ';
}

function HeroNoteIcon({ icon }: { icon: string | null }) {
  const IconComponent = icon ? serviceCatalogIconMap[icon] : null;
  if (IconComponent) return <IconComponent aria-hidden="true" />;
  return <CheckBadgeIcon aria-hidden="true" />;
}

function CategoryCard({ cat }: { cat: ServiceCatalogCategory }) {
  const IconComponent = !cat.image && cat.icon ? serviceCatalogIconMap[cat.icon] : null;
  const positionCount = cat.totalWorkTypes ?? cat.items.length;
  const cardBg = cat.cardBackgroundImage?.trim();
  const transparentCard = Boolean(cat.cardBackgroundTransparent);
  // Админка может скрыть плитку с иконкой/картинкой в карточке
  const hideIcon = Boolean(cat.iconDisabled);
  // Заданный в админке цвет строки с количеством работ (чтобы не сливалась с фоном карточки)
  const countColor = cat.countTextColor?.trim() || null;

  return (
    <Link
      href={getSafeHref(`/catalog/services/${cat.slug}`)}
      className={`${styles.categoryCard} ${cardBg ? styles.categoryCardHasBg : ''} ${transparentCard ? styles.categoryCardTransparent : ''}`}
      style={cardBg ? { backgroundImage: `url(${cardBg})` } : undefined}
    >
      {cardBg ? <span className={styles.categoryCardBgScrim} aria-hidden /> : null}
      {hideIcon ? null : cat.image ? (
        <span className={styles.categoryCardMedia}>
          <img src={cat.image} alt="" className={styles.categoryCardImage} loading="lazy" />
        </span>
      ) : (
        <span className={styles.categoryCardMedia}>
          {IconComponent ? <IconComponent className={styles.categoryCardIconSvg} /> : null}
        </span>
      )}
      <div className={styles.categoryCardBody}>
        <h2 className={styles.categoryCardTitle}>{cat.name}</h2>
        {cat.description?.trim() ? (
          <p className={styles.categoryCardDescription}>{cat.description}</p>
        ) : null}
      </div>
      <div className={styles.categoryCardFooter}>
        <span
          className={styles.categoryCardCount}
          style={countColor ? { color: countColor } : undefined}
        >
          {positionCount > 0
            ? `${positionCount} ${pluralizeWorkTypes(positionCount)}`
            : 'Подробнее'}
        </span>
        <ArrowRightIcon className={styles.categoryCardArrow} aria-hidden="true" />
      </div>
    </Link>
  );
}

export function ServiceCatalogPageView({ model }: ServiceCatalogPageViewProps) {
  const { data, showLoading } = model;

  if (showLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <ChevronRightIcon aria-hidden="true" />
            <span aria-current="page">{data?.block?.title ?? 'Ремонт квартир'}</span>
          </nav>
          <h1 className={styles.pageTitle}>{data?.block?.title ?? 'Ремонт квартир'}</h1>
          <p className={styles.empty}>
            Раздел в разработке. Скоро здесь появится каталог видов работ.
          </p>
        </div>
      </div>
    );
  }

  const block = data.block;
  const heroNotes =
    block.heroNotes && block.heroNotes.length > 0 ? block.heroNotes : DEFAULT_HERO_NOTES;
  const steps = block.steps && block.steps.length > 0 ? block.steps : DEFAULT_STEPS;
  const seoText = block.seoText?.trim();
  const seoTextTitle = block.seoTextTitle?.trim();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <ChevronRightIcon aria-hidden="true" />
          <span aria-current="page">{block.title}</span>
        </nav>

        <h1 className={styles.pageTitle}>{block.title}</h1>

        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.heroSubtitle}>{block.subtitle?.trim() || DEFAULT_HERO_SUBTITLE}</p>
            <p className={styles.heroDescription}>
              {block.description?.trim() || DEFAULT_HERO_DESCRIPTION}
            </p>
            <ul className={styles.heroNotes}>
              {heroNotes.map((note) => (
                <li key={note.text}>
                  <HeroNoteIcon icon={note.icon} />
                  {note.text}
                </li>
              ))}
            </ul>
          </div>
          {block.heroImageUrl?.trim() ? (
            <div className={styles.heroImage}>
              <img src={block.heroImageUrl.trim()} alt={block.title} loading="eager" />
            </div>
          ) : null}
        </section>

        <section className={styles.categoriesSection} aria-label="Категории работ">
          <h2 className={styles.sectionTitle}>Выберите категорию работ</h2>
          <div className={styles.grid}>
            {data.categories.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </section>

        <section className={styles.stepsSection} aria-label="Этапы работы">
          <h2 className={styles.sectionTitle}>{DEFAULT_STEPS_TITLE}</h2>
          <ol className={styles.stepsList}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.stepItem}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                {step.description?.trim() ? (
                  <p className={styles.stepDescription}>{step.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {seoText ? (
          <section className={styles.seoSection} aria-label="О ремонте квартир">
            <h2 className={styles.sectionTitle}>{seoTextTitle || 'О ремонте квартир'}</h2>
            <p className={styles.seoText}>{seoText}</p>
          </section>
        ) : null}

        <ServiceCatalogCtaBlock block={block} />
      </div>
    </div>
  );
}
