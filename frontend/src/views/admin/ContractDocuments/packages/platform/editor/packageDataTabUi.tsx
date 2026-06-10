'use client';

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

import type { CSSProperties } from 'react';

import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import styles from './PackageDataTab.module.css';

export function PackageTabLockIcon() {
  return (
    <svg
      className={cdProduct.packageTabLockIcon}
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function PackageDataSectionLockInline({ title }: { title: string }) {
  return (
    <span
      className={styles.packageDataSectionLockInline}
      role="img"
      aria-label={title}
      title={title}
    >
      <PackageTabLockIcon />
    </span>
  );
}

export function PackageDataPartySectionCollapseButton({
  expanded,
  sectionLabel,
  controlsId,
  onToggle,
}: {
  expanded: boolean;
  sectionLabel: string;
  controlsId: string;
  onToggle: () => void;
}) {
  const actionLabel = expanded ? 'Свернуть' : 'Развернуть';
  return (
    <button
      type="button"
      className={`${cdWorkspace.secondaryBtn} ${styles.packageDataPartySectionCollapseBtn}`}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={`${actionLabel} блок «${sectionLabel}»`}
      title={actionLabel}
      onClick={onToggle}
    >
      {expanded ? (
        <ChevronUpIcon className={styles.packageDataPartySectionCollapseIcon} aria-hidden />
      ) : (
        <ChevronDownIcon className={styles.packageDataPartySectionCollapseIcon} aria-hidden />
      )}
    </button>
  );
}

function isFilledContractDataField(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function calcPackageSectionCompletionPercent(values: readonly unknown[]): number {
  if (!values.length) return 0;
  let filled = 0;
  for (const value of values) {
    if (isFilledContractDataField(value)) filled += 1;
  }
  return Math.round((filled / values.length) * 100);
}

export function packageCompletionBadgeStyle(percent: number): CSSProperties {
  const normalized = Math.max(0, Math.min(100, percent));
  const hue = Math.round((normalized / 100) * 120);
  return {
    color: `hsl(${hue} 80% 28%)`,
    background: `hsl(${hue} 85% 94%)`,
    borderColor: `hsl(${hue} 65% 72%)`,
  };
}
