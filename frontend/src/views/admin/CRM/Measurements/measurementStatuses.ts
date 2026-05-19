/** Статусы замера в UI (форма, список, журнал). */
export const MEASUREMENT_STATUS_OPTIONS = [
  { value: 'NEW', label: 'Новый' },
  { value: 'COMPLETED', label: 'Выполнен' },
  { value: 'CANCELLED', label: 'Отказ' },
  { value: 'CONVERTED', label: 'Договор' },
] as const;

export const MEASUREMENT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отказ',
  CONVERTED: 'Договор',
};

export function getMeasurementStatusLabel(status: string): string {
  return MEASUREMENT_STATUS_LABELS[status] ?? status;
}
