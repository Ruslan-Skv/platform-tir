import {
  dismissAdminBellNotifications,
  getAdminBellDismissedKeys,
} from '@/shared/api/admin-notifications';

export const NOTIFICATIONS_DISMISSED_PREFIX = 'admin_notifications_dismissed';
const LOCAL_DISMISSED_MAX = 1500;

export function notificationItemKey(type: string, id: string) {
  return `${type}:${id}`;
}

function getDismissedNotificationsKey(userId: string) {
  return `${NOTIFICATIONS_DISMISSED_PREFIX}_${userId}`;
}

export function loadDismissedNotificationIdsFromLocalStorage(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getDismissedNotificationsKey(userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is string => typeof value === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveDismissedNotificationIdsToLocalStorage(userId: string, ids: Set<string>) {
  const trimmed = [...ids].slice(-LOCAL_DISMISSED_MAX);
  localStorage.setItem(getDismissedNotificationsKey(userId), JSON.stringify(trimmed));
}

export async function syncDismissedNotificationIds(userId: string): Promise<Set<string>> {
  const local = loadDismissedNotificationIdsFromLocalStorage(userId);

  try {
    const serverKeys = await getAdminBellDismissedKeys();
    const serverSet = new Set(serverKeys);
    const merged = new Set([...serverSet, ...local]);

    const toUpload = [...local].filter((key) => !serverSet.has(key));
    if (toUpload.length > 0) {
      await dismissAdminBellNotifications(toUpload);
    }

    saveDismissedNotificationIdsToLocalStorage(userId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function addDismissedNotificationKeys(
  userId: string,
  current: Set<string>,
  keys: string[]
): Promise<Set<string>> {
  const newKeys = keys.filter((key) => key && !current.has(key));
  if (newKeys.length === 0) return current;

  const next = new Set(current);
  for (const key of newKeys) next.add(key);

  saveDismissedNotificationIdsToLocalStorage(userId, next);
  try {
    await dismissAdminBellNotifications(newKeys);
  } catch {
    /* ignore */
  }
  return next;
}
