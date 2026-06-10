'use client';

import cdBase from '../../../../styles/base.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';

export type EstimateWorkspaceCategoryPickerProps = {
  categories: Array<{ slug: string; name: string }>;
  selectedSlugs: string[];
  onToggleCategory: (slug: string) => void;
};

export function EstimateWorkspaceCategoryPicker({
  categories,
  selectedSlugs,
  onToggleCategory,
}: EstimateWorkspaceCategoryPickerProps) {
  return (
    <div className={`${cdBase.sectionCard} ${cdWorkspace.estimateWorkspaceCategoriesCard}`}>
      <h3 className={cdBase.sectionTitle}>Категории работ</h3>
      <p className={cdBase.hint} style={{ marginTop: 4, marginBottom: 10 }}>
        Можно выбрать несколько — для каждой откроется вкладка калькулятора ниже.
      </p>
      <div className={cdWorkspace.estimateWorkspaceCategoryChips}>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`${cdWorkspace.estimateWorkspaceCategoryChip} ${
              selectedSlugs.includes(c.slug) ? cdWorkspace.estimateWorkspaceCategoryChipActive : ''
            }`}
            onClick={() => onToggleCategory(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
