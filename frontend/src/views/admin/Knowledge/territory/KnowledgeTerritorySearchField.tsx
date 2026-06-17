'use client';

import type { KnowledgeMaterialSearchSuggestion } from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { getMaterialTypeIcon, getMaterialTypeLabel } from '../shared/knowledge-utils';
import styles from './KnowledgeTerritorySearchField.module.css';
import { useKnowledgeTerritorySearchField } from './hooks/useKnowledgeTerritorySearchField';

type KnowledgeTerritorySearchFieldProps = {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchApply: (query: string) => void;
  onPickMaterial: (suggestion: KnowledgeMaterialSearchSuggestion) => void;
  categoryId?: string;
  moduleId?: string;
  type?: string;
};

export function KnowledgeTerritorySearchField({
  searchInput,
  onSearchInputChange,
  onSearchApply,
  onPickMaterial,
  categoryId,
  moduleId,
  type,
}: KnowledgeTerritorySearchFieldProps) {
  const {
    suggestions,
    highlight,
    listId,
    loadingSug,
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
  } = useKnowledgeTerritorySearchField({
    searchInput,
    onSearchInputChange,
    onSearchApply,
    onPickMaterial,
    categoryId,
    moduleId,
    type,
  });

  return (
    <div className={styles.searchShell}>
      <form className={styles.searchForm} onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          placeholder="Поиск по названию и описанию…"
          aria-label="Поиск материалов"
          aria-expanded={showDropdown || showEmpty}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={searchInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchBtn}>
          Найти
        </button>
      </form>

      {(showDropdown || showEmpty) && (
        <ul
          id={listId}
          className={styles.suggestionsList}
          role="listbox"
          aria-label="Подсказки материалов"
          onMouseDown={cancelBlurClose}
        >
          {loadingSug && (
            <li className={styles.suggestionsLoading} role="presentation">
              Поиск…
            </li>
          )}
          {!loadingSug &&
            suggestions.map((suggestion, index) => (
              <li key={suggestion.id} role="presentation">
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
                  onClick={() => pickSuggestion(suggestion)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {suggestion.thumbnailUrl ? (
                    <img
                      className={styles.suggestionThumb}
                      src={publicUploadUrl(suggestion.thumbnailUrl)}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span className={styles.suggestionThumbPlaceholder} aria-hidden>
                      {getMaterialTypeIcon(suggestion.type)}
                    </span>
                  )}
                  <span className={styles.suggestionText}>
                    <span className={styles.suggestionName}>{suggestion.title}</span>
                    {suggestion.excerpt ? (
                      <span className={styles.suggestionMeta}>{suggestion.excerpt}</span>
                    ) : (
                      <span className={styles.suggestionMeta}>
                        {getMaterialTypeLabel(suggestion.type)}
                        {suggestion.moduleName
                          ? ` · ${suggestion.moduleName}`
                          : ` · ${suggestion.categoryName}`}
                      </span>
                    )}
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
}
