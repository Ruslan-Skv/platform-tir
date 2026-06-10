'use client';

import { ApprovedOrderGuardProvider } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { CartProvider } from '@/shared/lib/contexts/CartContext';
import measurementFormStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';
import { ServiceCategoryPage } from '@/views/services/ui/ServiceCategoryPage/ServiceCategoryPage';

import cdBase from '../../../../styles/base.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';

export type EstimateWorkspaceCalculatorPaneProps = {
  estimateCalculatorError: string | null;
  categorySlugs: string[];
  categories: Array<{ slug: string; name: string }>;
  activeCategorySlug: string;
  onActiveCategoryChange: (slug: string) => void;
};

export function EstimateWorkspaceCalculatorPane({
  estimateCalculatorError,
  categorySlugs,
  categories,
  activeCategorySlug,
  onActiveCategoryChange,
}: EstimateWorkspaceCalculatorPaneProps) {
  return (
    <div className={cdWorkspace.docPane}>
      {estimateCalculatorError ? (
        <p
          className={`${measurementFormStyles.fieldError} ${cdWorkspace.estimateWorkspaceCalculatorError}`}
          role="alert"
        >
          {estimateCalculatorError}
        </p>
      ) : null}
      {categorySlugs.length > 0 ? (
        <CartProvider>
          <div className={`${cdChrome.tabBar} ${cdWorkspace.estimateWorkspaceTabBar}`}>
            {categorySlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                className={
                  slug === activeCategorySlug ? `${cdBase.tab} ${cdBase.tabActive}` : cdBase.tab
                }
                onClick={() => onActiveCategoryChange(slug)}
              >
                {categories.find((c) => c.slug === slug)?.name ?? slug}
              </button>
            ))}
          </div>
          {activeCategorySlug ? (
            <div>
              <ApprovedOrderGuardProvider>
                <ServiceCategoryPage
                  key={activeCategorySlug}
                  slug={activeCategorySlug}
                  hideAddToCart
                  hideBreadcrumbs
                  hideTitleBlock
                  allowCustomWorkItems={activeCategorySlug === 'prochie'}
                />
              </ApprovedOrderGuardProvider>
            </div>
          ) : null}
        </CartProvider>
      ) : (
        <p className={cdBase.hint}>Выберите минимум одну категорию для работы с калькулятором.</p>
      )}
    </div>
  );
}
