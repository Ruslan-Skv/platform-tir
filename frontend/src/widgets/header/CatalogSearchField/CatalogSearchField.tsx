'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import React from 'react';

import { type CatalogHeaderSearchState } from '../useCatalogHeaderSearch';
import styles from './CatalogSearchField.module.css';

export interface CatalogSearchFieldProps {
  /** Одно состояние поиска на весь header; null — плейсхолдер до Suspense */
  catalogSearch: CatalogHeaderSearchState | null;
  /** Класс-обёртка потребителя: задаёт ширину/отступы в конкретном месте шапки */
  className?: string;
}

/**
 * Поле «Поиск» с подсказками товаров — общее для вариантов шапки
 * (TopBar классической шапки, ряд пилюли в липкой). Ширину и позиционирование
 * задаёт потребитель через className; выпадающий список подсказок
 * позиционируется от корневого элемента.
 */
export const CatalogSearchField: React.FC<CatalogSearchFieldProps> = ({
  catalogSearch,
  className,
}) => {
  const rootClassName = className ? `${styles.field} ${className}` : styles.field;

  if (!catalogSearch) {
    return (
      <div className={rootClassName} aria-hidden>
        <div className={styles.searchForm}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Поиск..."
            disabled
            readOnly
          />
          <span className={styles.searchSubmit}>
            <MagnifyingGlassIcon className={styles.searchIcon} />
          </span>
        </div>
      </div>
    );
  }

  const {
    searchQuery,
    suggestions,
    loadingSug,
    highlight,
    listId,
    setHighlight,
    cancelBlurClose,
    pickSuggestion,
    handleSearchSubmit,
    handleInputBlur,
    handleInputFocus,
    handleInputChange,
    handleInputKeyDown,
    showDropdown,
    showEmpty,
  } = catalogSearch;

  return (
    <div className={rootClassName}>
      <form className={styles.searchForm} onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Поиск..."
          aria-label="Поиск"
          aria-expanded={showDropdown || showEmpty}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={searchQuery}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
        />
        <button type="submit" className={styles.searchSubmit} aria-label="Искать">
          <MagnifyingGlassIcon className={styles.searchIcon} />
        </button>
      </form>

      {(showDropdown || showEmpty) && (
        <ul
          id={listId}
          className={styles.suggestionsList}
          role="listbox"
          aria-label="Подсказки товаров"
          onMouseDown={cancelBlurClose}
        >
          {loadingSug && (
            <li className={styles.suggestionsLoading} role="presentation">
              Поиск…
            </li>
          )}
          {!loadingSug &&
            suggestions.map((s, index) => (
              <li key={s.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={highlight === index}
                  className={styles.suggestionItem}
                  data-active={highlight === index ? 'true' : 'false'}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    cancelBlurClose();
                  }}
                  onClick={() => pickSuggestion(s)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {s.imageUrl ? (
                    <img
                      className={styles.suggestionThumb}
                      src={s.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span className={styles.suggestionThumb} aria-hidden />
                  )}
                  <span className={styles.suggestionText}>
                    <span className={styles.suggestionName}>{s.name}</span>
                    {s.sku ? <span className={styles.suggestionMeta}>Арт. {s.sku}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          {!loadingSug && suggestions.length === 0 && (
            <li className={styles.suggestionsLoading} role="presentation">
              Ничего не найдено
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
