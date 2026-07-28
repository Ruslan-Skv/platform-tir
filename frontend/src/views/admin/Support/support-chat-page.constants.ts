export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  CLOSED: 'Закрыт',
};

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'OPEN', label: 'Открыт' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'CLOSED', label: 'Закрыт' },
] as const;
