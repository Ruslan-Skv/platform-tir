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

  try {
    return await fetch(input, { ...init, signal });
  } catch (e) {
    // Истёк таймаут (свой сигнал) — показываем понятную причину, а не "The user aborted a request."
    if (e instanceof DOMException && e.name === 'AbortError' && !init?.signal?.aborted) {
      throw new TimeoutError(timeoutMs);
    }
    throw e;
  }
}

/** Запрос не успел завершиться за отведённый таймаут. */
export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `Превышено время ожидания сервера (${Math.round(timeoutMs / 1000)} с). Попробуйте ещё раз.`
    );
    this.name = 'TimeoutError';
  }
}

/** SSR-запросы к API: короткий таймаут, чтобы страница не зависала при недоступном бэкенде. */
export function serverFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_SERVER_FETCH_TIMEOUT_MS
): Promise<Response> {
  return fetchWithTimeout(input, init, timeoutMs);
}
