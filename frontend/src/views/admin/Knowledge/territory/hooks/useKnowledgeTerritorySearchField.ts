'use client';

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import {
  type KnowledgeMaterialSearchSuggestion,
  getKnowledgeMaterialSearchSuggestions,
} from '@/shared/api/admin-knowledge';

const SUGGEST_MIN_CHARS = 2;
const SUGGEST_DEBOUNCE_MS = 280;

type UseKnowledgeTerritorySearchFieldOptions = {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchApply: (query: string) => void;
  onPickMaterial: (suggestion: KnowledgeMaterialSearchSuggestion) => void;
  categoryId?: string;
  moduleId?: string;
  type?: string;
};

export function useKnowledgeTerritorySearchField({
  searchInput,
  onSearchInputChange,
  onSearchApply,
  onPickMaterial,
  categoryId,
  moduleId,
  type,
}: UseKnowledgeTerritorySearchFieldOptions) {
  const [suggestions, setSuggestions] = useState<KnowledgeMaterialSearchSuggestion[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loadingSug, setLoadingSug] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const blurCloseTimerRef = useRef<number | null>(null);
  const skipOpenAfterPickRef = useRef(false);
  const listId = useId();

  const cancelBlurClose = useCallback(() => {
    if (blurCloseTimerRef.current != null) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
  }, []);

  const closeSuggestions = useCallback(() => {
    cancelBlurClose();
    setListOpen(false);
    setHighlight(-1);
  }, [cancelBlurClose]);

  const pickSuggestion = useCallback(
    (suggestion: KnowledgeMaterialSearchSuggestion) => {
      cancelBlurClose();
      setListOpen(false);
      setSuggestions([]);
      setHighlight(-1);
      skipOpenAfterPickRef.current = true;
      onSearchInputChange(suggestion.title);
      onPickMaterial(suggestion);
    },
    [cancelBlurClose, onPickMaterial, onSearchInputChange]
  );

  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < SUGGEST_MIN_CHARS) {
      setSuggestions([]);
      setListOpen(false);
      setLoadingSug(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoadingSug(true);
      try {
        const data = await getKnowledgeMaterialSearchSuggestions({
          q,
          limit: 8,
          categoryId: categoryId || undefined,
          moduleId: moduleId || undefined,
          type: type || undefined,
        });
        if (ac.signal.aborted) return;
        const items = data.suggestions ?? [];
        setSuggestions(items);
        setHighlight(-1);
        if (skipOpenAfterPickRef.current) {
          skipOpenAfterPickRef.current = false;
          setListOpen(false);
        } else {
          setListOpen(true);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setSuggestions([]);
        setListOpen(false);
      } finally {
        if (!ac.signal.aborted) {
          setLoadingSug(false);
        }
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, categoryId, moduleId, type]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blurCloseTimerRef.current != null) clearTimeout(blurCloseTimerRef.current);
    };
  }, []);

  const handleSearchSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      closeSuggestions();
      onSearchApply(searchInput.trim());
    },
    [closeSuggestions, onSearchApply, searchInput]
  );

  const handleInputBlur = useCallback(() => {
    const id = window.setTimeout(() => {
      setListOpen(false);
      setHighlight(-1);
      blurCloseTimerRef.current = null;
    }, 180);
    blurCloseTimerRef.current = id;
  }, []);

  const handleInputFocus = useCallback(() => {
    cancelBlurClose();
    if (searchInput.trim().length >= SUGGEST_MIN_CHARS && (suggestions.length > 0 || loadingSug)) {
      setListOpen(true);
    }
  }, [cancelBlurClose, loadingSug, searchInput, suggestions.length]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      skipOpenAfterPickRef.current = false;
      onSearchInputChange(e.target.value);
    },
    [onSearchInputChange]
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && listOpen) {
        e.preventDefault();
        closeSuggestions();
        return;
      }

      if (!listOpen || (suggestions.length === 0 && !loadingSug)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((i) => {
          const max = Math.max(0, suggestions.length - 1);
          return i < max ? i + 1 : i;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((i) => (i > 0 ? i - 1 : -1));
      } else if (e.key === 'Enter' && highlight >= 0 && suggestions[highlight]) {
        e.preventDefault();
        pickSuggestion(suggestions[highlight]);
      }
    },
    [closeSuggestions, highlight, listOpen, loadingSug, pickSuggestion, suggestions]
  );

  const showDropdown =
    listOpen &&
    searchInput.trim().length >= SUGGEST_MIN_CHARS &&
    (loadingSug || suggestions.length > 0);

  const showEmpty =
    listOpen &&
    searchInput.trim().length >= SUGGEST_MIN_CHARS &&
    !loadingSug &&
    suggestions.length === 0;

  return {
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
  };
}
