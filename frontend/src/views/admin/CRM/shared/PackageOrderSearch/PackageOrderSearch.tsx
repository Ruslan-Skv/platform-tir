'use client';

import { useEffect, useId, useState } from 'react';

import {
  type ContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';

import styles from './PackageOrderSearch.module.css';
import {
  packageResultAddress,
  packageResultMeta,
  packageResultTitle,
} from './packageOrderSearchFields';

export type PackageOrderSearchProps = {
  /** Id поля поиска — для label/aria. */
  id: string;
  /** Текст поля: поисковый запрос или подпись выбранного заказа. */
  searchValue: string;
  /** Id выбранного заказа ('' — ничего не выбрано). */
  selectedPackageId: string;
  /** Изменение текста поиска — родитель сбрасывает выбор при вводе. */
  onSearchChange: (value: string) => void;
  /** Выбор заказа из результатов. */
  onSelect: (pkg: ContractDocumentPackage) => void;
  /** Сброс выбора и очистка поиска. */
  onClear: () => void;
};

export function PackageOrderSearch({
  id,
  searchValue,
  selectedPackageId,
  onSearchChange,
  onSelect,
  onClear,
}: PackageOrderSearchProps) {
  const listboxId = useId();
  const [hits, setHits] = useState<ContractDocumentPackage[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  /** Поиск только после действий пользователя — не при открытии формы с уже заполненным текстом. */
  const [searchInteractive, setSearchInteractive] = useState(false);

  useEffect(() => {
    if (selectedPackageId || !searchValue) {
      setSearchInteractive(false);
    }
  }, [selectedPackageId, searchValue]);

  useEffect(() => {
    if (selectedPackageId) {
      setDebouncedSearch('');
      return;
    }
    if (!searchInteractive) {
      setDebouncedSearch('');
      return;
    }
    const query = searchValue.trim();
    const timer = window.setTimeout(() => setDebouncedSearch(query), 380);
    return () => window.clearTimeout(timer);
  }, [selectedPackageId, searchValue, searchInteractive]);

  useEffect(() => {
    if (selectedPackageId || debouncedSearch.length < 2) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    void getContractDocumentPackages({ search: debouncedSearch, limit: 30 })
      .then((rows) => {
        if (!cancelled) setHits(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setHits([]);
          setSearchError('Не удалось выполнить поиск заказа');
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedPackageId]);

  const showOrderDropdown = searchInteractive && !selectedPackageId && debouncedSearch.length >= 2;

  return (
    <article className={styles.orderSearchPanel}>
      <div className={styles.orderSearchPanelHead}>
        <div>
          <h3 className={styles.orderSearchTitle}>Поиск заказа</h3>
          <p className={styles.orderSearchHint}>
            Найдите пакет по договору, заказчику или названию (от 2 символов)
          </p>
        </div>
        {selectedPackageId ? (
          <span className={styles.orderSearchLinkedBadge}>Заказ выбран</span>
        ) : null}
      </div>
      <div className={styles.orderSearchWrap}>
        <div className={styles.orderSearchRow}>
          <input
            id={id}
            type="search"
            className={styles.orderSearchInput}
            value={searchValue}
            onChange={(e) => {
              setSearchInteractive(true);
              onSearchChange(e.target.value);
            }}
            placeholder="Поиск: договор, заказчик, название…"
            autoComplete="off"
            aria-label="Поиск заказа по договору, заказчику или названию (от 2 символов)"
            aria-expanded={showOrderDropdown}
            aria-controls={listboxId}
          />
          {selectedPackageId || searchValue ? (
            <button type="button" className={styles.orderSearchClearButton} onClick={onClear}>
              Снять выбор
            </button>
          ) : null}
        </div>
        {showOrderDropdown ? (
          <div className={styles.orderSearchDropdown} id={listboxId} role="presentation">
            {searching ? <p className={styles.orderSearchMuted}>Поиск…</p> : null}
            {!searching && searchError ? (
              <p className={styles.orderSearchError}>{searchError}</p>
            ) : null}
            {!searching && !searchError && hits.length === 0 ? (
              <p className={styles.orderSearchMuted}>Ничего не найдено</p>
            ) : null}
            {!searching && !searchError && hits.length > 0 ? (
              <ul
                className={styles.orderSearchResults}
                role="listbox"
                aria-label="Результаты поиска заказа"
              >
                {hits.map((pkg) => {
                  const address = packageResultAddress(pkg);
                  const meta = packageResultMeta(pkg);
                  return (
                    <li key={pkg.id} role="option" className={styles.orderSearchResultItem}>
                      <button
                        type="button"
                        className={styles.orderSearchResultButton}
                        onClick={() => onSelect(pkg)}
                      >
                        <span className={styles.orderSearchResultName}>
                          {packageResultTitle(pkg)}
                        </span>
                        {meta ? <span className={styles.orderSearchResultMeta}>{meta}</span> : null}
                        {address ? (
                          <span className={styles.orderSearchResultAddress}>Объект: {address}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
