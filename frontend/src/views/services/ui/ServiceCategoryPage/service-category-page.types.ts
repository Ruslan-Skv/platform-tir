export interface ServiceCategoryPageProps {
  slug: string;
  hideAddToCart?: boolean;
  hideBreadcrumbs?: boolean;
  hideTitleBlock?: boolean;
  /** Доп. виды работ только в черновике расчёта (категория «Прочие работы»). */
  allowCustomWorkItems?: boolean;
}
