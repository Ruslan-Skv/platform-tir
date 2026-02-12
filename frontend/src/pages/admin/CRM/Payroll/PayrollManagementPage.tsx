'use client';

import React, { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import styles from './PayrollManagementPage.module.css';

const STORAGE_KEY = 'admin_payroll_management_columns';

const TABLE_HEADERS = [
  { key: 'pctManager', title: '% з/п Менеджер', width: '90px' },
  { key: 'pctLeadSpec', title: '% з/п Вед. спец.', width: '90px' },
  { key: 'pctSurveyor', title: '% з/п Замерщик', width: '90px' },
  { key: 'pctBrigadier', title: '% з/п Бригадир', width: '90px' },
  { key: 'surveyor', title: 'Замерщик', width: '120px' },
  { key: 'brigadier', title: 'Бригадир', width: '120px' },
  { key: 'manager', title: 'Менеджер', width: '120px' },
  { key: 'contractNumber', title: '№ договора', width: '100px' },
  { key: 'contractDate', title: 'Дата заключения', width: '100px' },
  { key: 'deliveryDate', title: 'Дата сдачи', width: '100px' },
  { key: 'customerName', title: 'ФИО заказчика', width: '140px' },
  { key: 'contractAmount', title: 'Стоимость договора (первоначальная)', width: '120px' },
  { key: 'ds1Amount', title: 'Д/с №1 сумма', width: '90px' },
  { key: 'ds1Date', title: 'Д/с №1 дата', width: '90px' },
  { key: 'ds2Amount', title: 'Д/с №2 сумма', width: '90px' },
  { key: 'ds2Date', title: 'Д/с №2 дата', width: '90px' },
  { key: 'ds3Amount', title: 'Д/с №3 сумма', width: '90px' },
  { key: 'ds3Date', title: 'Д/с №3 дата', width: '90px' },
  { key: 'ds4Amount', title: 'Д/с №4 сумма', width: '90px' },
  { key: 'ds4Date', title: 'Д/с №4 дата', width: '90px' },
  { key: 'ds5Amount', title: 'Д/с №5 сумма', width: '90px' },
  { key: 'ds5Date', title: 'Д/с №5 дата', width: '90px' },
  { key: 'contractAmountWithDs', title: 'Стоимость договора с учётом д/с', width: '120px' },
  { key: 'payment1', title: 'Оплата 1', width: '80px' },
  { key: 'payment2', title: 'Оплата 2', width: '80px' },
  { key: 'payment3', title: 'Оплата 3', width: '80px' },
  { key: 'payment4', title: 'Оплата 4', width: '80px' },
  { key: 'payment5', title: 'Оплата 5', width: '80px' },
  { key: 'payment6', title: 'Оплата 6', width: '80px' },
  { key: 'payment7', title: 'Оплата 7', width: '80px' },
  { key: 'payment8', title: 'Оплата 8', width: '80px' },
  { key: 'payment9', title: 'Оплата 9', width: '80px' },
  { key: 'payment10', title: 'Оплата 10', width: '80px' },
  { key: 'remainingAmount', title: 'Остаток по договору (сумма)', width: '110px' },
  { key: 'remainingPct', title: 'Остаток по договору (% остатка)', width: '110px' },
  { key: 'salaryManagerContract', title: 'З/п Менеджера (по договору)', width: '110px' },
  { key: 'salaryManagerDs', title: 'З/п Менеджера (по д/с)', width: '110px' },
  { key: 'salaryBrigadierContract', title: 'З/п Бригадира (по договору)', width: '110px' },
  { key: 'salaryBrigadierDs', title: 'З/п Бригадира (по д/с)', width: '110px' },
  { key: 'salaryLeadSpecContract', title: 'З/п Вед. спец. (по договору)', width: '110px' },
  { key: 'salaryLeadSpecDs', title: 'З/п Вед. спец. (по д/с)', width: '110px' },
  { key: 'salarySurveyorContract', title: 'З/п Замерщика (по договору)', width: '110px' },
  { key: 'salarySurveyorDs', title: 'З/п Замерщика (по д/с)', width: '110px' },
];

const ALL_COLUMN_KEYS = TABLE_HEADERS.map((c) => c.key);

function getDefaultColumns(): string[] {
  return [...ALL_COLUMN_KEYS];
}

function loadSavedColumns(): string[] {
  if (typeof window === 'undefined') return getDefaultColumns();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((k: unknown) => typeof k === 'string' && ALL_COLUMN_KEYS.includes(k));
      }
    }
  } catch {
    // ignore
  }
  return getDefaultColumns();
}

export function PayrollManagementPage() {
  const [periodMonth, setPeriodMonth] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [periodYear, setPeriodYear] = useState(() => String(new Date().getFullYear()));

  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    typeof window !== 'undefined' ? loadSavedColumns() : getDefaultColumns()
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };
    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnSelector]);

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns((prev) => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
      }
      return newColumns;
    });
  };

  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }
    setSelectedColumns((prev) => {
      const newColumns = [...prev];
      const draggedIndex = newColumns.indexOf(draggedColumn);
      const targetIndex = newColumns.indexOf(targetKey);
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
      }
      return newColumns;
    });
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const moveColumn = (columnKey: string, direction: 'up' | 'down') => {
    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnKey);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newColumns = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
      }
      return newColumns;
    });
  };

  const visibleColumns = selectedColumns
    .map((key) => TABLE_HEADERS.find((c) => c.key === key))
    .filter((c): c is (typeof TABLE_HEADERS)[number] => !!c);
  const availableToAdd = TABLE_HEADERS.filter((c) => !selectedColumns.includes(c.key));

  const rows: Record<string, string>[] = []; // Пустые данные до подключения API

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin/crm/payroll" className={styles.backLink}>
            ← Расчёт з/п
          </Link>
          <h1 className={styles.title}>Управление</h1>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.columnSelectorWrapper} ref={columnSelectorRef}>
            <button
              type="button"
              className={`${styles.columnSelectorButton} ${showColumnSelector ? styles.columnSelectorButtonActive : ''}`}
              onClick={() => setShowColumnSelector(!showColumnSelector)}
            >
              ⚙️ Колонки
            </button>
            {showColumnSelector && (
              <div className={styles.columnSelectorDropdown}>
                <div className={styles.columnSelectorHeader}>
                  <span>Выберите и упорядочьте колонки:</span>
                </div>
                <div className={styles.columnsList}>
                  {visibleColumns.length > 0 && (
                    <div className={styles.selectedColumnsSection}>
                      <div className={styles.sectionLabel}>
                        Отображаемые (перетащите для сортировки):
                      </div>
                      {visibleColumns.map((col, index) => (
                        <div
                          key={col.key}
                          className={`${styles.columnItem} ${styles.selected} ${draggedColumn === col.key ? styles.dragging : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, col.key)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, col.key)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className={styles.dragHandle} title="Перетащите">
                            ⋮⋮
                          </span>
                          <input
                            type="checkbox"
                            checked
                            onChange={() => toggleColumn(col.key)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Скрыть колонку ${col.title}`}
                          />
                          <span className={styles.columnTitle}>{col.title}</span>
                          <div className={styles.columnOrderButtons}>
                            <button
                              type="button"
                              className={styles.orderButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveColumn(col.key, 'up');
                              }}
                              disabled={index === 0}
                              title="Переместить вверх"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={styles.orderButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveColumn(col.key, 'down');
                              }}
                              disabled={index === visibleColumns.length - 1}
                              title="Переместить вниз"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {availableToAdd.length > 0 && (
                    <div className={styles.availableColumnsSection}>
                      <div className={styles.sectionLabel}>Доступные колонки:</div>
                      {availableToAdd.map((col) => (
                        <div key={col.key} className={styles.columnItem}>
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleColumn(col.key)}
                            aria-label={`Показать колонку ${col.title}`}
                          />
                          <span className={styles.columnTitle}>{col.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Месяц
          <select
            className={styles.filterSelect}
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            aria-label="Месяц"
          >
            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => (
              <option key={m} value={m}>
                {new Date(2000, parseInt(m, 10) - 1).toLocaleString('ru-RU', { month: 'long' })}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Год
          <select
            className={styles.filterSelect}
            value={periodYear}
            onChange={(e) => setPeriodYear(e.target.value)}
            aria-label="Год"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className={styles.emptyCell}>
                  Нет данных за выбранный период. Данные появятся после подключения API.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {visibleColumns.map((col) => (
                    <td key={col.key}>{row[col.key] ?? '—'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
