'use client';

import {
  CheckBadgeIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

import Link from 'next/link';

import { useFormContext } from '@/features/forms/context/FormContext';
import type { WindowProfileSystem } from '@/shared/api/windows';
import { Button } from '@/shared/ui/Button/Button';

import styles from './WindowsPage.module.css';
import type { WindowsPageModel } from './hooks/useWindowsPage';

const RUBLE_FORMAT = new Intl.NumberFormat('ru-RU');

function formatPriceFrom(priceFrom: number | null): string | null {
  if (priceFrom == null) return null;
  return `от ${RUBLE_FORMAT.format(priceFrom)} ₽`;
}

/** Карточка выбранной профильной системы. */
function SystemCard({
  system,
  getImageUrl,
  onOrder,
}: {
  system: WindowProfileSystem;
  getImageUrl: (url: string | null | undefined) => string;
  onOrder: () => void;
}) {
  const imageUrl = getImageUrl(system.imageUrl);
  const specs: { label: string; value: string }[] = [
    { label: 'Камеры профиля', value: system.chambers != null ? String(system.chambers) : '—' },
    {
      label: 'Монтажная глубина',
      value: system.mountingDepth != null ? `${system.mountingDepth} мм` : '—',
    },
    { label: 'Стеклопакет', value: system.glassUnitWidth ?? '—' },
    { label: 'Теплозащита Rопр', value: system.thermalResistance ?? '—' },
    { label: 'Звукоизоляция', value: system.soundInsulation ?? '—' },
    ...(system.characteristics ?? []),
  ];
  const priceLabel = formatPriceFrom(system.priceFrom);

  return (
    <article className={styles.systemCard}>
      <div className={styles.systemMedia}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${system.name} — профильная система`} loading="lazy" />
        ) : (
          <div className={styles.systemMediaPlaceholder} aria-hidden="true">
            <span className={styles.systemMediaName}>{system.name}</span>
            <span className={styles.systemMediaSpecs}>
              {system.chambers != null && <span>{system.chambers} камер</span>}
              {system.mountingDepth != null && <span>{system.mountingDepth} мм</span>}
              {system.thermalResistance && <span>Rопр {system.thermalResistance}</span>}
            </span>
          </div>
        )}
        {system.badge && <span className={styles.badge}>{system.badge}</span>}
      </div>

      <div className={styles.systemBody}>
        <h3 className={styles.systemName}>{system.name}</h3>
        {system.tagline && <p className={styles.systemTagline}>{system.tagline}</p>}
        <p className={styles.systemDescription}>{system.description}</p>

        <dl className={styles.specsList}>
          {specs.map((spec) => (
            <div key={spec.label} className={styles.specsRow}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>

        {system.advantages.length > 0 && (
          <ul className={styles.advantages}>
            {system.advantages.map((advantage) => (
              <li key={advantage}>
                <CheckIcon className={styles.advantageIcon} aria-hidden="true" />
                {advantage}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.systemFooter}>
          {priceLabel && <span className={styles.priceFrom}>{priceLabel}</span>}
          <Button variant="primary" onClick={onOrder} data-action-button="order-window">
            Рассчитать стоимость
          </Button>
        </div>
      </div>
    </article>
  );
}

export function WindowsPageView({ model }: { model: WindowsPageModel }) {
  const { settings, brands, activeBrand, activeSystem, selectBrand, selectSystem, getImageUrl } =
    model;
  const { measurementModal, quoteModal } = useFormContext();

  const comparisonRows = brands.flatMap((brand) =>
    brand.systems.map((system) => ({ brand, system }))
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <ChevronRightIcon aria-hidden="true" />
          <span aria-current="page">{settings.title}</span>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>{settings.title}</h1>
            {settings.subtitle && <p className={styles.heroSubtitle}>{settings.subtitle}</p>}
            {settings.description && (
              <p className={styles.heroDescription}>{settings.description}</p>
            )}
            <div className={styles.heroActions}>
              <Button
                variant="primary"
                size="lg"
                onClick={measurementModal.open}
                data-action-button="measurement"
              >
                Вызвать замерщика
              </Button>
              <Button variant="outline" size="lg" onClick={quoteModal.open}>
                Рассчитать стоимость
              </Button>
            </div>
            <ul className={styles.heroNotes}>
              <li>
                <ShieldCheckIcon aria-hidden="true" />
                Монтаж по стандартам
              </li>
              <li>
                <ClockIcon aria-hidden="true" />
                Бесплатный замер
              </li>
              <li>
                <CheckBadgeIcon aria-hidden="true" />
                Гарантия на окна и работы
              </li>
            </ul>
          </div>
          {settings.heroImageUrl && (
            <div className={styles.heroImage}>
              {}
              <img src={getImageUrl(settings.heroImageUrl)} alt={settings.title} loading="eager" />
            </div>
          )}
        </section>

        {brands.length > 0 && (
          <section className={styles.brandsSection} aria-label="Профильные системы">
            <h2 className={styles.sectionTitle}>Выберите производителя профиля</h2>
            <div className={styles.brandTabs} role="tablist" aria-label="Производители профилей">
              {brands.map((brand) => {
                const isActive = activeBrand?.slug === brand.slug;
                return (
                  <button
                    key={brand.slug}
                    type="button"
                    role="tab"
                    id={`windows-tab-${brand.slug}`}
                    aria-selected={isActive}
                    aria-controls="windows-brand-panel"
                    data-active={isActive || undefined}
                    className={styles.brandTab}
                    onClick={() => selectBrand(brand.slug)}
                  >
                    {brand.logoUrl && (
                      <img
                        src={getImageUrl(brand.logoUrl)}
                        alt=""
                        loading="lazy"
                        className={styles.brandTabLogo}
                      />
                    )}
                    <span>{brand.name}</span>
                    <span className={styles.brandTabCount}>{brand.systems.length} системы</span>
                  </button>
                );
              })}
            </div>

            {activeBrand && (
              <div
                id="windows-brand-panel"
                role="tabpanel"
                aria-labelledby={`windows-tab-${activeBrand.slug}`}
                className={styles.brandPanel}
              >
                <div className={styles.brandHeader}>
                  <h3 className={styles.brandName}>{activeBrand.name}</h3>
                  {activeBrand.country && (
                    <span className={styles.brandCountry}>{activeBrand.country}</span>
                  )}
                  {activeBrand.description && (
                    <p className={styles.brandDescription}>{activeBrand.description}</p>
                  )}
                </div>

                {activeBrand.systems.length > 0 ? (
                  <>
                    <div
                      className={styles.systemTabs}
                      role="tablist"
                      aria-label={`Профильные системы ${activeBrand.name}`}
                    >
                      {activeBrand.systems.map((system) => {
                        const isActive = activeSystem?.slug === system.slug;
                        return (
                          <button
                            key={system.slug}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            data-active={isActive || undefined}
                            className={styles.systemTab}
                            onClick={() => selectSystem(system.slug)}
                          >
                            {system.name}
                          </button>
                        );
                      })}
                    </div>

                    {activeSystem && (
                      <SystemCard
                        key={activeSystem.slug}
                        system={activeSystem}
                        getImageUrl={getImageUrl}
                        onOrder={quoteModal.open}
                      />
                    )}
                  </>
                ) : (
                  <p className={styles.emptySystems}>
                    Профильные системы этого производителя скоро появятся.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {comparisonRows.length > 0 && (
          <section className={styles.comparisonSection} aria-label="Сравнение профильных систем">
            <h2 className={styles.sectionTitle}>Сравнение профильных систем</h2>
            <div className={styles.tableScroll}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th scope="col">Профиль</th>
                    <th scope="col">Камеры</th>
                    <th scope="col">Глубина</th>
                    <th scope="col">Стеклопакет</th>
                    <th scope="col">Теплозащита Rопр</th>
                    <th scope="col">Звукоизоляция</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(({ brand, system }) => (
                    <tr key={system.slug}>
                      <th scope="row">
                        <span className={styles.comparisonBrand}>{brand.name}</span>
                        {system.name}
                      </th>
                      <td>{system.chambers ?? '—'}</td>
                      <td>{system.mountingDepth != null ? `${system.mountingDepth} мм` : '—'}</td>
                      <td>{system.glassUnitWidth ?? '—'}</td>
                      <td>{system.thermalResistance ?? '—'}</td>
                      <td>{system.soundInsulation ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.comparisonNote}>
              Характеристики приведены по данным производителей. Итоговые свойства окна зависят от
              стеклопакета, фурнитуры и монтажа — подберём комплектацию на бесплатном замере.
            </p>
          </section>
        )}

        <section className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>Поможем выбрать профиль</h2>
          <p className={styles.ctaText}>
            Расскажите про помещение и бюджет — предложим оптимальную профильную систему, рассчитаем
            стоимость с монтажом и ответим на вопросы.
          </p>
          <div className={styles.ctaActions}>
            <Button
              variant="primary"
              size="lg"
              onClick={measurementModal.open}
              data-action-button="measurement"
            >
              Вызвать замерщика
            </Button>
            <Button variant="outline" size="lg" onClick={quoteModal.open}>
              Получить расчёт
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
