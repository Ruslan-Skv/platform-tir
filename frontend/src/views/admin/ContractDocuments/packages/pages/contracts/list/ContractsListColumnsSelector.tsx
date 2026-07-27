'use client';

import { useEffect, useRef, useState } from 'react';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import {
  CONTRACTS_LIST_COLUMN_DEFS,
  type ContractsListColumnKey,
  isContractsListColumnLocked,
  toggleContractsListVisibleColumn,
} from './contractsListColumns';

type ContractsListColumnsSelectorProps = {
  visibleColumns: ContractsListColumnKey[];
  onVisibleColumnsChange: (next: ContractsListColumnKey[]) => void;
  disabled?: boolean;
};

export function ContractsListColumnsSelector({
  visibleColumns,
  onVisibleColumnsChange,
  disabled,
}: ContractsListColumnsSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  return (
    <div className={cdHub.contractsListColumnSelectorWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${cdHub.contractsListColumnsBtn}${open ? ` ${cdHub.contractsListColumnsBtnActive}` : ''}`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Колонки"
        title="Колонки"
        onClick={() => setOpen((v) => !v)}
      >
        { }
        <img
          src="/admin/icons/table-columns.png"
          alt=""
          width={20}
          height={20}
          className={cdHub.contractsListColumnsBtnIcon}
          aria-hidden
        />
      </button>
      {open ? (
        <div className={cdHub.contractsListColumnSelectorDropdown} role="menu">
          <div className={cdHub.contractsListColumnSelectorHeader}>
            Показать или скрыть колонки таблицы
          </div>
          <div className={cdHub.contractsListColumnSelectorList}>
            {CONTRACTS_LIST_COLUMN_DEFS.map((col) => {
              const locked = isContractsListColumnLocked(col.key);
              const checked = visibleColumns.includes(col.key);
              return (
                <label
                  key={col.key}
                  className={`${cdHub.contractsListColumnSelectorItem}${
                    checked ? ` ${cdHub.contractsListColumnSelectorItemSelected}` : ''
                  }${locked ? ` ${cdHub.contractsListColumnSelectorItemLocked}` : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked || disabled}
                    onChange={() =>
                      onVisibleColumnsChange(
                        toggleContractsListVisibleColumn(visibleColumns, col.key)
                      )
                    }
                  />
                  <span>{col.title}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
