'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

type Props = {
  /** Ключ localStorage для сохранения свёрнутости (по секции). */
  storageKey: string;
  /** Заголовок в свёрнутом виде («Фильтры журнала», «Фильтры графика монтажей»…). */
  title: string;
  /** Подписи активных фильтров для свёрнутого состояния; пусто — «Все». */
  summaryLabels: string[];
  children: ReactNode;
};

function readCollapsed(storageKey: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(storageKey) === '1';
  } catch {
    return true;
  }
}

/**
 * Сворачиваемый блок фильтров — как в журнале ДП (/admin/dp):
 * шеврон + заголовок, «Изменить», в свёрнутом виде — чипы активных фильтров.
 * Свёрнутость сохраняется в localStorage по ключу секции.
 */
export function CollapsibleFiltersPanel({ storageKey, title, summaryLabels, children }: Props) {
  const filtersContentId = useId();
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));

  const toggle = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section className={cdHub.contractsListFiltersPanel} aria-label={title}>
      <div className={cdHub.contractsListFiltersPanelHeader}>
        <button
          type="button"
          className={cdHub.contractsListFiltersPanelToggle}
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={filtersContentId}
        >
          <span className={cdHub.contractsListFiltersPanelChevron} aria-hidden>
            {collapsed ? '▸' : '▾'}
          </span>
          <span className={cdHub.contractsListFiltersPanelTitle}>
            {collapsed ? title : 'Свернуть фильтры'}
          </span>
        </button>
        {collapsed ? (
          <button
            type="button"
            className={cdHub.contractsListFiltersPanelExpandLink}
            onClick={toggle}
          >
            Изменить
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          className={cdHub.contractsListFiltersSummary}
          onClick={toggle}
          aria-label={`Развернуть фильтры: ${title}`}
        >
          {(summaryLabels.length > 0 ? summaryLabels : ['Все']).map((label, index) => (
            <span
              key={`${label}-${index}`}
              className={cdHub.contractsListFiltersSummaryChip}
              title={label}
            >
              {label}
            </span>
          ))}
        </button>
      ) : (
        <div id={filtersContentId} className={cdHub.contractsListFiltersPanelBody}>
          {children}
        </div>
      )}
    </section>
  );
}
