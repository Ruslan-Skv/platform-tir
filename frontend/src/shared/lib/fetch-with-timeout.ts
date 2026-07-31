import { NetworkUnavailableError, isBrowserOnline } from '@/shared/lib/browser-network';

const DEFAULT_SERVER_FETCH_TIMEOUT_MS = 8_000;
const DEFAULT_CLIENT_FETCH_TIMEOUT_MS = 15_000;

function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0]!;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

/** fetch с таймаутом; при истечении — AbortError. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_CLIENT_FETCH_TIMEOUT_MS
): Promise<Response> {
  // Не зовём fetch в офлайне — иначе браузер пишет net::ERR_INTERNET_DISCONNECTED.
  if (typeof window !== 'undefined' && !isBrowserOnline()) {
    throw new NetworkUnavailableError();
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? mergeAbortSignals([init.signal, timeoutSignal]) : timeoutSignal;

  return fetch(input, { ...init, signal });
}

/** SSR-запросы к API: короткий таймаут, чтобы страница не зависала при недоступном бэкенде. */
export function serverFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_SERVER_FETCH_TIMEOUT_MS
): Promise<Response> {
  return fetchWithTimeout(input, init, timeoutMs);
}
