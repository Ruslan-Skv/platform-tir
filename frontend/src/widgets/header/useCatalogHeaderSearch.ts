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

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_DEBOUNCE_MS = 280;

/** После выбора подсказки: { name, slug } — подставляем name только если URL = /product/[slug]. */
const SESSION_SEARCH_FROM_SUGGESTION = 'platform_tir_topbar_search_pick';

function readProductSlugFromPathname(pathname: string): string | null {
  if (!pathname.startsWith('/product/')) return null;
  const rest = pathname.slice('/product/'.length);
  const segment = rest.split('/')[0];
  return segment ? decodeURIComponent(segment) : null;
}

export interface ProductSearchSuggestion {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  imageUrl: string | null;
}

/**
 * Поиск по каталогу с подсказками: синхронизация с URL каталога и карточкой товара,
 * запрос подсказок на любой странице (в т.ч. /product/...).
 */
export function useCatalogHeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSearchSuggestion[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loadingSug, setLoadingSug] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const blurCloseTimerRef = useRef<number | null>(null);
  /** Не раскрывать список после подстановки названия из подсказки / session (пока пользователь не сфокусируется или не изменит текст). */
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
    (s: ProductSearchSuggestion) => {
      cancelBlurClose();
      setListOpen(false);
      setSuggestions([]);
      setHighlight(-1);
      skipOpenAfterPickRef.current = true;
      setSearchQuery(s.name);
      try {
        sessionStorage.setItem(
          SESSION_SEARCH_FROM_SUGGESTION,
          JSON.stringify({ name: s.name, slug: s.slug })
        );
      } catch {
        /* приватный режим и т.п. */
      }
      router.push(`/product/${encodeURIComponent(s.slug)}`);
    },
    [cancelBlurClose, router]
  );

  useEffect(() => {
    if (pathname?.startsWith('/catalog/products')) {
      try {
        sessionStorage.removeItem(SESSION_SEARCH_FROM_SUGGESTION);
      } catch {
        /* ignore */
      }
      skipOpenAfterPickRef.current = false;
      setSearchQuery(searchParams.get('search') ?? '');
      return;
    }

    if (pathname?.startsWith('/product/')) {
      const pathSlug = readProductSlugFromPathname(pathname);
      try {
        const raw = sessionStorage.getItem(SESSION_SEARCH_FROM_SUGGESTION);
        if (raw && pathSlug) {
          const parsed = JSON.parse(raw) as { name?: string; slug?: string };
          if (parsed.slug === pathSlug && typeof parsed.name === 'string') {
            skipOpenAfterPickRef.current = true;
            setSearchQuery(parsed.name);
            return;
          }
          sessionStorage.removeItem(SESSION_SEARCH_FROM_SUGGESTION);
        }
      } catch {
        try {
          sessionStorage.removeItem(SESSION_SEARCH_FROM_SUGGESTION);
        } catch {
          /* ignore */
        }
      }
      setSearchQuery('');
      return;
    }

    try {
      sessionStorage.removeItem(SESSION_SEARCH_FROM_SUGGESTION);
    } catch {
      /* ignore */
    }
    skipOpenAfterPickRef.current = false;
    setSearchQuery('');
  }, [pathname, searchParams]);

  useEffect(() => {
    const q = searchQuery.trim();
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
        const res = await apiFetch(
          `${API_URL}/products/search/suggestions?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal }
        );
        if (!res.ok) throw new Error('suggestions failed');
        const data: { suggestions?: ProductSearchSuggestion[] } = await res.json();
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
        setLoadingSug(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

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
      const q = searchQuery.trim();
      if (q) {
        router.push(`/catalog/products?search=${encodeURIComponent(q)}`);
      } else {
        router.push('/catalog/products');
      }
    },
    [closeSuggestions, router, searchQuery]
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
    if (searchQuery.trim().length >= SUGGEST_MIN_CHARS && (suggestions.length > 0 || loadingSug)) {
      setListOpen(true);
    }
  }, [cancelBlurClose, loadingSug, searchQuery, suggestions.length]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    skipOpenAfterPickRef.current = false;
    const v = e.target.value;
    if (v === '') {
      try {
        sessionStorage.removeItem(SESSION_SEARCH_FROM_SUGGESTION);
      } catch {
        /* ignore */
      }
    }
    setSearchQuery(v);
  }, []);

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
    searchQuery.trim().length >= SUGGEST_MIN_CHARS &&
    (loadingSug || suggestions.length > 0);

  const showEmpty =
    listOpen &&
    searchQuery.trim().length >= SUGGEST_MIN_CHARS &&
    !loadingSug &&
    suggestions.length === 0;

  return {
    searchQuery,
    suggestions,
    listOpen,
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
  };
}

export type CatalogHeaderSearchState = ReturnType<typeof useCatalogHeaderSearch>;
