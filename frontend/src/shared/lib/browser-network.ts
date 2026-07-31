/** Пауза после возврата на вкладку / online — иначе Chrome пишет ERR_INTERNET_DISCONNECTED. */
const NETWORK_SETTLE_MS = 450;

let quietUntilMs = 0;
let wakeBound = false;

function markNetworkWake(settleMs = NETWORK_SETTLE_MS): void {
  quietUntilMs = Date.now() + settleMs;
}

function bindWakeListeners(): void {
  if (typeof window === 'undefined' || wakeBound) return;
  wakeBound = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') markNetworkWake();
  });
  window.addEventListener('online', () => markNetworkWake());
  window.addEventListener('focus', () => markNetworkWake());
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

/** Сеть «встала» после пробуждения вкладки (для фоновых поллеров). */
export function isNetworkSettled(): boolean {
  bindWakeListeners();
  return isBrowserOnline() && Date.now() >= quietUntilMs;
}

/**
 * Можно ли стартовать фоновый poll (уведомления, heartbeat и т.п.).
 * Вкладка может быть скрыта — опрос должен продолжаться (бейдж, заявки, push-fallback).
 * Блокируем только offline и короткую паузу сразу после возврата/online (шум ERR_INTERNET_DISCONNECTED).
 */
export function canRunBackgroundNetwork(): boolean {
  return isNetworkSettled();
}

export class NetworkUnavailableError extends Error {
  readonly name = 'NetworkUnavailableError';

  constructor(message = 'Network unavailable') {
    super(message);
  }
}

/** true, если ошибка из‑за офлайна / намеренного пропуска запроса. */
export function isNetworkUnavailableError(error: unknown): boolean {
  return error instanceof NetworkUnavailableError;
}

/**
 * Дождаться online + settle, затем выполнить action (в т.ч. на скрытой вкладке).
 * Нужно для поллеров уведомлений / бейджа, пока пользователь на другой вкладке.
 */
export async function whenOnlineSettled(action: () => void | Promise<void>): Promise<void> {
  if (typeof window === 'undefined') return;
  bindWakeListeners();

  for (;;) {
    if (!isBrowserOnline()) {
      await new Promise<void>((resolve) => {
        const onOnline = () => {
          window.removeEventListener('online', onOnline);
          resolve();
        };
        window.addEventListener('online', onOnline);
      });
      continue;
    }

    const waitMs = Math.max(0, quietUntilMs - Date.now());
    if (waitMs > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, waitMs);
      });
      continue;
    }

    break;
  }

  if (!isBrowserOnline()) return;
  await action();
}

/**
 * Как whenOnlineSettled, но только если вкладка сейчас видима (catch-up при возврате).
 */
export async function whenVisibleAndOnline(action: () => void | Promise<void>): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isDocumentVisible()) return;
  await whenOnlineSettled(async () => {
    if (!isDocumentVisible()) return;
    await action();
  });
}
