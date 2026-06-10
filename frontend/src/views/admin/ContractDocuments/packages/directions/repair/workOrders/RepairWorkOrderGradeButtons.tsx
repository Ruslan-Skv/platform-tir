'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';

export type RepairWorkOrderGradePercent = 0 | 5 | 10;

const GRADE_OPTIONS: Array<{ value: RepairWorkOrderGradePercent; label: string }> = [
  { value: 0, label: '4 разряд' },
  { value: 5, label: '5 разряд' },
  { value: 10, label: '6 разряд' },
];

function gradeButtonClassName(
  value: RepairWorkOrderGradePercent,
  selected: RepairWorkOrderGradePercent
): string {
  const base = cdDataTab.repairWorkOrderGradeBtn;
  if (value !== selected) return base;
  if (value === 0) return `${base} ${cdDataTab.repairWorkOrderGradeBtnActive4}`;
  if (value === 5) return `${base} ${cdDataTab.repairWorkOrderGradeBtnActive5}`;
  return `${base} ${cdDataTab.repairWorkOrderGradeBtnActive6}`;
}

export type RepairWorkOrderGradeButtonsProps = {
  value: RepairWorkOrderGradePercent;
  onChange: (value: RepairWorkOrderGradePercent) => void;
};

export function RepairWorkOrderGradeButtons({ value, onChange }: RepairWorkOrderGradeButtonsProps) {
  return (
    <div className={cdDataTab.repairWorkOrderGradeField}>
      <div className={cdDataTab.repairWorkOrderGradeBar} role="group" aria-label="Разряд мастера">
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
