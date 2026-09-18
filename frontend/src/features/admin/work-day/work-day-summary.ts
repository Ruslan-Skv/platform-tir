/** Склонение минут для сообщений: «1 минуту», «2 минуты», «5 минут», «21 минуту». */
export function pluralMinutes(minutes: number): string {
  const abs = Math.abs(minutes) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'минут';
  if (last > 1 && last < 5) return 'минуты';
  if (last === 1) return 'минуту';
  return 'минут';
}

export type WorkDayEndSummary = {
  /** Сообщения о нарушениях режима (опоздание, ранний уход). */
  lines: string[];
  /** Приписка про индивидуальный график — показывается при наличии нарушений. */
  note: string | null;
};

export function hasWorkDayViolations(day: {
  lateMinutes: number;
  earlyLeaveMinutes: number;
}): boolean {
  return day.lateMinutes > 0 || day.earlyLeaveMinutes > 0;
}

/**
 * Тексты по итогам рабочего дня: опоздание и ранний уход (сверх допуска)
 * плюс приписка о согласовании индивидуального графика с руководителем.
 */
export function buildWorkDayEndSummary(
  displayName: string,
  day: { lateMinutes: number; earlyLeaveMinutes: number }
): WorkDayEndSummary {
  const lines: string[] = [];
  if (day.lateMinutes > 0) {
    lines.push(
      `${displayName}, сегодня вы опоздали на ${day.lateMinutes} ${pluralMinutes(day.lateMinutes)}`
    );
  }
  if (day.earlyLeaveMinutes > 0) {
    lines.push(
      `${displayName}, сегодня вы заканчиваете работу на ${day.earlyLeaveMinutes} ${pluralMinutes(
        day.earlyLeaveMinutes
      )} раньше установленного режима работы`
    );
  }
  const note = hasWorkDayViolations(day)
    ? `${displayName}, при необходимости вы можете согласовать с руководителем индивидуальный график работы`
    : null;
  return { lines, note };
}
