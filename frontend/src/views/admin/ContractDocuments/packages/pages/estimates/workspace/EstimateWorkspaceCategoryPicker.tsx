'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';

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
    <div className={`${cdTemplates.sectionCard} ${cdWorkspace.estimateWorkspaceCategoriesCard}`}>
      <h3 className={cdEstimateTab.sectionTitle}>Категории работ</h3>
      <p className={cdDocPreview.hint} style={{ marginTop: 4, marginBottom: 10 }}>
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
