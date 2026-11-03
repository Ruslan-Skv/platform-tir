'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import styles from './SalaryPage.module.css';

/** Ключ localStorage со списком свёрнутых блоков вкладки расчёта з/п. */
const COLLAPSED_BLOCKS_STORAGE_KEY = 'admin_salary_calc_collapsed_blocks_v1';

type CollapsedBlocksController = {
  /** Ключи свёрнутых блоков. */
  collapsed: Set<string>;
  toggle: (key: string) => void;
};

const CollapsedBlocksContext = createContext<CollapsedBlocksController | null>(null);

function readCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_BLOCKS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed instanceof Array
      ? new Set(parsed.filter((k): k is string => typeof k === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

/** Состояние свёрнутости блоков — одно на вкладку, сохраняется в localStorage. */
export function CollapsedBlocksProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed());

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_BLOCKS_STORAGE_KEY, JSON.stringify([...collapsed]));
    } catch {
      /* localStorage недоступен — состояние просто не сохранится */
    }
  }, [collapsed]);

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);
  return (
    <CollapsedBlocksContext.Provider value={value}>{children}</CollapsedBlocksContext.Provider>
  );
}

/** Блок вкладки со сворачиваемым содержимым: заголовок-кнопка с шевроном + опциональные действия. */
export function CollapsibleSection({
  blockKey,
  title,
  actions,
  className,
  children,
}: {
  /** Ключ блока, под которым хранится его свёрнутость. */
  blockKey: string;
  title: ReactNode;
  /** Элементы в строке заголовка справа (например, фильтр по направлению). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useContext(CollapsedBlocksContext);
  const isCollapsed = ctx?.collapsed.has(blockKey) ?? false;
  return (
    <div className={className ?? styles.tableBlock}>
      <div className={styles.collapsibleHeader}>
        <button
          type="button"
          className={styles.collapsibleToggle}
          onClick={() => ctx?.toggle(blockKey)}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Развернуть блок' : 'Свернуть блок'}
        >
          <span className={styles.collapsibleChevron} aria-hidden>
            {isCollapsed ? '▸' : '▾'}
          </span>
          <span className={styles.sectionTitle}>{title}</span>
        </button>
        {actions}
      </div>
      {isCollapsed ? null : children}
    </div>
  );
}
