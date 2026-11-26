'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';
import { PACKAGE_TAB_SEGMENTED, PACKAGE_TAB_SEGMENTED_BTN } from '../../ui/packageTabClassNames';

export type PackageWorkOrderGradePercent = 0 | 5 | 10;

const GRADE_OPTIONS: Array<{ value: PackageWorkOrderGradePercent; label: string }> = [
  { value: 0, label: '4 разряд' },
  { value: 5, label: '5 разряд' },
  { value: 10, label: '6 разряд' },
];

/** Тон активного сегмента: 4-й разряд — синий (активный сегмент по умолчанию), 5-й — янтарный, 6-й — красный. */
function gradeToneClassName(
  value: PackageWorkOrderGradePercent,
  selected: PackageWorkOrderGradePercent
): string {
  if (value !== selected || value === 0) return '';
  return value === 5
    ? cdDataTab.packageWorkOrderGradeToneWarning
    : cdDataTab.packageWorkOrderGradeToneDanger;
}

export type PackageWorkOrderGradeButtonsProps = {
  value: PackageWorkOrderGradePercent;
  onChange: (value: PackageWorkOrderGradePercent) => void;
};

export function PackageWorkOrderGradeButtons({
  value,
  onChange,
}: PackageWorkOrderGradeButtonsProps) {
  return (
    <div className={PACKAGE_TAB_SEGMENTED} role="group" aria-label="Разряд мастера">
      {GRADE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={[PACKAGE_TAB_SEGMENTED_BTN, gradeToneClassName(option.value, value)]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
