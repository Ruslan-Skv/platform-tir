export const HISTORY_DEFAULT_LIMIT = 20;
export const HISTORY_MAX_LIMIT = 50;
export const HISTORY_MAX_PACKAGES = 200;

export function parseHistoryQuery(params?: { page?: number; limit?: number }): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, params?.page ?? 1);
  let limit = params?.limit ?? HISTORY_DEFAULT_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) limit = HISTORY_DEFAULT_LIMIT;
  limit = Math.min(Math.floor(limit), HISTORY_MAX_LIMIT);
  return { page, limit };
}
