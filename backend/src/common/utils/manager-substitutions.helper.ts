/** Подмена менеджера на период отпуска/больничного — чистые функции выбора
 *  активной подмены. Используются расчётом з/п и журналом ДП (продажи,
 *  пометки «подмена»), поэтому живут вне модулей без зависимостей. */

export type ManagerSubstitutionPeriod = {
  absentManagerId: string;
  substituteManagerId: string;
  dateFrom: Date;
  dateTo: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Активна ли подмена в указанную дату (период включительно по обоим концам). */
export function isSubstitutionActive(sub: ManagerSubstitutionPeriod, date: Date): boolean {
  const t = date.getTime();
  return t >= sub.dateFrom.getTime() && t < sub.dateTo.getTime() + DAY_MS;
}

/** Идентификатор подменяющего, если на дату активна подмена менеджера; иначе null. */
export function substituteManagerIdAt(
  substitutions: ManagerSubstitutionPeriod[],
  absentManagerId: string | null | undefined,
  date: Date,
): string | null {
  if (!absentManagerId) return null;
  for (const sub of substitutions) {
    if (sub.absentManagerId === absentManagerId && isSubstitutionActive(sub, date)) {
      return sub.substituteManagerId;
    }
  }
  return null;
}

/** Подмены, пересекающие период [from, to] (по включительным датам). */
export function substitutionsOverlapping<T extends ManagerSubstitutionPeriod>(
  substitutions: T[],
  from: Date,
  to: Date,
): T[] {
  return substitutions.filter(
    (s) => s.dateFrom.getTime() <= to.getTime() && s.dateTo.getTime() + DAY_MS > from.getTime(),
  );
}
