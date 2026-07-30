export const STATUS_SELECT_CLASS_BY_VALUE: Record<string, string> = {
  NEW: 'statusSelectNew',
  COMPLETED: 'statusSelectCompleted',
  CANCELLED: 'statusSelectCancelled',
  CONVERTED: 'statusSelectConverted',
};

export const MEASUREMENT_STATUS_ORDER_HINT =
  'Все статусы менеджер выставляет вручную в этом списке, кроме «Выполнен»: его можно выбрать вручную ' +
  'или он присваивается автоматически после фиксации замера по всем направлениям (кнопка «Зафиксировать вкладку»). ' +
  'Чтобы записать бланк и результаты на сервер, нажмите «Сохранить замер» вверху страницы.';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const REPAIR_MEASUREMENT_DATA_MARKER = '[REPAIR_MEASUREMENT_DATA_V1]';
export const MEASUREMENT_SAVED_TABS_MARKER = '[MEASUREMENT_SAVED_TABS_V1]';
export const MAX_ROOMS_COUNT = 15;
