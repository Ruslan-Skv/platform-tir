'use client';

import { Breadcrumbs } from '../Breadcrumbs';
import { CatalogHubPreview } from '../CatalogHubPreview';
import { CatalogItemListJsonLd } from '../CatalogItemListJsonLd';
import { CatalogSeoFallbackController } from '../CatalogSeoFallbackController';
import { FiltersSidebar } from '../FiltersSidebar';
import { Pagination } from '../Pagination';
import { ProductsGrid } from '../ProductsGrid';
import styles from './CatalogPage.module.css';
import type { CatalogPageModel } from './hooks/useCatalogPage';

type CatalogPageViewProps = {
  model: CatalogPageModel;
};

export function CatalogPageView({ model }: CatalogPageViewProps) {
  const {
    displayCategoryName,
    parentCategoryName,
    parentCategorySlug,
    categorySlug,
    initialPage,
    initialHubPreview,
    listUrl,
    hideMobileBreadcrumbs,
    catalogUrlKey,
    showFilterColumn,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    catalogFilters,
    filtersLoading,
    hubCategoriesLoading,
    priceBounds,
    effectiveCategoryOptions,
    isCatalogHub,
    isCategoryPage,
    catalogBranchOptions,
    activeCatalogBranchSlug,
    isHubPreviewMode,
    facetBranchSlug,
    totalPages,
    currentPage,
    handlePageChange,
    setTotalPages,
    goToFirstCatalogPage,
    setPriceBounds,
    setCatalogGridReady,
  } = model;

  return (
    <div
      className={`${styles.catalogPage}${hideMobileBreadcrumbs ? ` ${styles.catalogPageHideMobileBreadcrumbs}` : ''}`}
    >
      <CatalogSeoFallbackController syncKey={catalogUrlKey} />
      {initialPage?.products?.length && listUrl ? (
        <CatalogItemListJsonLd products={initialPage.products} listUrl={listUrl} />
      ) : null}
      {/* 1. Верхний блок: хлебные крошки */}
      <div className={styles.topSection}>
        <div className={styles.breadcrumbsSection}>
          <Breadcrumbs
            categoryName={displayCategoryName}
            parentCategoryName={parentCategoryName}
            parentCategorySlug={parentCategorySlug}
          />
        </div>
      </div>

      {/* 2. Основной контент - фильтры и товары */}
      <div
        className={`${styles.mainContent} ${!showFilterColumn ? styles.mainContentFullWidth : ''}`}
      >
        {/* Десктоп: боковая панель фильтров */}
        {showFilterColumn ? (
          <aside className={styles.filtersSidebar}>
            <FiltersSidebar
              filters={catalogFilters}
              loading={filtersLoading || hubCategoriesLoading}
              priceBounds={priceBounds}
              categoryOptions={effectiveCategoryOptions}
              parentCategoryRadioMode={isCatalogHub}
              categoryPageBranchMode={isCategoryPage}
              catalogBranchOptions={catalogBranchOptions}
              activeCatalogBranchSlug={activeCatalogBranchSlug}
              catalogBranchRadioGroupSuffix="desktop"
            />
          </aside>
        ) : null}

        {/* Мобильные: оверлей с фильтрами (панель снизу) */}
        {showFilterColumn ? (
          <div
            className={styles.filtersOverlay}
            data-open={mobileFiltersOpen}
            aria-hidden={!mobileFiltersOpen}
          >
            <div className={styles.filtersBackdrop} onClick={() => setMobileFiltersOpen(false)} />
            <div className={styles.filtersDrawer}>
              <FiltersSidebar
                mobileOpen={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                filters={catalogFilters}
                loading={filtersLoading || hubCategoriesLoading}
                priceBounds={priceBounds}
                categoryOptions={effectiveCategoryOptions}
                parentCategoryRadioMode={isCatalogHub}
                categoryPageBranchMode={isCategoryPage}
                catalogBranchOptions={catalogBranchOptions}
                activeCatalogBranchSlug={activeCatalogBranchSlug}
                catalogBranchRadioGroupSuffix="mobile"
              />
            </div>
          </div>
        ) : null}

        {/* Колонка с товарами или превью хаба */}
        <main className={styles.productsSection}>
          {isHubPreviewMode ? (
            <CatalogHubPreview
              categoryName={displayCategoryName}
              initialPreview={initialHubPreview}
              showMobileFiltersButton={showFilterColumn}
              onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
              onPreviewReady={setCatalogGridReady}
            />
          ) : (
            <ProductsGrid
              categorySlug={categorySlug}
              categoryName={displayCategoryName}
              onTotalPagesChange={setTotalPages}
              onSortChange={goToFirstCatalogPage}
              onProductsPerPageLayoutChange={goToFirstCatalogPage}
              onBasePriceBoundsChange={setPriceBounds}
              onCatalogGridReady={setCatalogGridReady}
              showMobileFiltersButton={showFilterColumn}
              onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
              initialPage={initialPage}
              facetBranchSlug={facetBranchSlug}
            />
          )}
        </main>
      </div>

      {/* 3. Нижний ряд - пагинация */}
      {totalPages > 1 && (
        <div className={styles.paginationSection}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export function CatalogPageFallback() {
  return (
    <div className={styles.catalogPage}>
      <p className={styles.suspenseFallback}>Загрузка каталога…</p>
    </div>
  );
}
