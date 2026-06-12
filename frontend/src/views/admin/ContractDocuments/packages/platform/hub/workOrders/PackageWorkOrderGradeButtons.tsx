'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';

export type PackageWorkOrderGradePercent = 0 | 5 | 10;

const GRADE_OPTIONS: Array<{ value: PackageWorkOrderGradePercent; label: string }> = [
  { value: 0, label: '4 разряд' },
  { value: 5, label: '5 разряд' },
  { value: 10, label: '6 разряд' },
];

function gradeButtonClassName(
  value: PackageWorkOrderGradePercent,
  selected: PackageWorkOrderGradePercent
): string {
  const base = cdDataTab.packageWorkOrderGradeBtn;
  if (value !== selected) return base;
  if (value === 0) return `${base} ${cdDataTab.packageWorkOrderGradeBtnActive4}`;
  if (value === 5) return `${base} ${cdDataTab.packageWorkOrderGradeBtnActive5}`;
  return `${base} ${cdDataTab.packageWorkOrderGradeBtnActive6}`;
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
    <div className={cdDataTab.packageWorkOrderGradeField}>
      <div className={cdDataTab.packageWorkOrderGradeBar} role="group" aria-label="Разряд мастера">
        {GRADE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={gradeButtonClassName(option.value, value)}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
