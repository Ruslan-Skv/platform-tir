import type { ApplyWorkPeriodToAllResult } from './packageSettingsConstants';

export function formatApplyWorkPeriodResult(
  res: ApplyWorkPeriodToAllResult,
  title: string
): string {
  const parts = [`Обновлено договоров «${title}»: ${res.updated}.`];
  if ((res.skippedSigned ?? 0) > 0) {
    parts.push(`Пропущено подписанных или отказных: ${res.skippedSigned}.`);
  }
  if ((res.skippedManual ?? 0) > 0) {
    parts.push(`Пропущено с ручным сроком в карточке: ${res.skippedManual}.`);
  }
  return parts.join(' ');
}
