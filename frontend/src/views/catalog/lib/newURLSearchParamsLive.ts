/**
 * Параметры из адресной строки: при нескольких `router.replace` подряд актуальнее,
 * чем `useSearchParams()` в замыкании второго вызова (иначе можно затереть только что выставленные `cat`).
 */
export function newURLSearchParamsLive(
  expectedPathname: string,
  fallbackSerialized: string
): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams(fallbackSerialized);
  }
  if (window.location.pathname !== expectedPathname) {
    return new URLSearchParams(fallbackSerialized);
  }
  const raw = window.location.search.startsWith('?') ? window.location.search.slice(1) : '';
  return new URLSearchParams(raw || fallbackSerialized);
}
