import type { CrmDirection, CrmUser, MeasurementHistoryEntry } from '@/shared/api/admin-crm';

import { MEASUREMENT_STATUS_LABELS as STATUS_LABELS } from './measurementStatuses';

const FIELD_LABELS: Record<string, string> = {
  receptionDate: 'Дата приёма',
  executionDate: 'Дата выполнения',
  managerId: 'Менеджер',
  surveyorId: 'Замерщик',
  directionId: 'Основное направление',
  additionalDirectionIds: 'Дополнительные направления',
  customerName: 'ФИО заказчика',
  customerAddress: 'Адрес',
  customerPhone: 'Телефон',
  customerId: 'Заказчик в базе',
  comments: 'Комментарии и результаты',
  measurementCreated: 'Создан замер',
  measurementRoomsUpdated: 'Изменён список помещений',
  measurementGeometryUpdated: 'Обновлены размеры и геометрия помещений',
  measurementWorksUpdated: 'Обновлены виды работ',
  measurementWorkQuantitiesUpdated: 'Обновлены количества по работам',
  measurementNoteUpdated: 'Изменён текст комментария',
};

const RESULT_TAB_LABELS: Record<string, string> = {
  repair: 'Ремонт',
  doors: 'Двери',
  windows: 'Окна',
  ceilings: 'Потолки',
  blinds: 'Жалюзи',
  furniture: 'Мебель',
};

function formatSnapshotValue(
  key: string,
  value: unknown,
  users: CrmUser[],
  directions: CrmDirection[]
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'status') return STATUS_LABELS[String(value)] ?? String(value);
  if (key === 'receptionDate' || key === 'executionDate') {
    return new Date(String(value)).toLocaleDateString('ru-RU');
  }
  if (key === 'managerId' || key === 'surveyorId') {
    const u = users.find((x) => x.id === value);
    if (!u) return String(value);
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return name || u.email || String(value);
  }
  if (key === 'directionId') {
    return directions.find((x) => x.id === value)?.name ?? String(value);
  }
  if (key === 'additionalDirectionIds' && Array.isArray(value)) {
    return value
      .map((id) => directions.find((x) => x.id === id)?.name ?? String(id))
      .filter(Boolean)
      .join(', ');
  }
  if (key === 'customerId') return value ? 'Привязан' : 'Не привязан';
  if (key === 'comments') return 'Обновлены данные в комментариях';
  return String(value);
}

function describeChangedField(
  field: string,
  before: Record<string, unknown>,
  after: Record<string, unknown> | null,
  users: CrmUser[],
  directions: CrmDirection[]
): string | null {
  if (field.startsWith('statusChanged:')) {
    const transition = field.slice('statusChanged:'.length);
    const [from, to] = transition.split('->');
    if (from && to) {
      return `Статус: ${STATUS_LABELS[from] ?? from} → ${STATUS_LABELS[to] ?? to}`;
    }
    return null;
  }
  if (field.startsWith('measurementTabSaved:')) {
    const tabId = field.slice('measurementTabSaved:'.length);
    return `Сохранены результаты замера (${RESULT_TAB_LABELS[tabId] ?? tabId})`;
  }
  if (field.startsWith('measurementTabUnsaved:')) {
    const tabId = field.slice('measurementTabUnsaved:'.length);
    return `Отменено сохранение результатов (${RESULT_TAB_LABELS[tabId] ?? tabId})`;
  }
  if (FIELD_LABELS[field] && !field.startsWith('measurement')) {
    const oldV = formatSnapshotValue(field, before[field], users, directions);
    const newV = after ? formatSnapshotValue(field, after[field], users, directions) : '—';
    if (oldV === newV) return null;
    return `${FIELD_LABELS[field]}: ${oldV} → ${newV}`;
  }
  if (FIELD_LABELS[field]) {
    return FIELD_LABELS[field];
  }
  return null;
}

export interface MeasurementJournalItem {
  id: string;
  changedAt: string;
  changedByLabel: string;
  actionLabel: string;
  descriptions: string[];
}

export function buildMeasurementJournal(
  history: MeasurementHistoryEntry[],
  users: CrmUser[],
  directions: CrmDirection[]
): MeasurementJournalItem[] {
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return sorted.map((entry, index) => {
    const afterSnapshot =
      index === 0 ? null : (sorted[index - 1]?.snapshot as Record<string, unknown>);
    const before = entry.snapshot as Record<string, unknown>;
    const descriptions: string[] = [];

    if (entry.action === 'CREATE') {
      descriptions.push('Создан замер');
    } else if (entry.action === 'ROLLBACK') {
      descriptions.push('Выполнен откат к сохранённой версии');
    } else {
      for (const field of entry.changedFields) {
        const text = describeChangedField(field, before, afterSnapshot, users, directions);
        if (text) descriptions.push(text);
      }
      if (descriptions.length === 0) {
        descriptions.push('Изменены данные замера');
      }
    }

    const name = entry.changedBy
      ? [entry.changedBy.firstName, entry.changedBy.lastName].filter(Boolean).join(' ') ||
        entry.changedBy.email
      : '—';

    return {
      id: entry.id,
      changedAt: entry.changedAt,
      changedByLabel: name || '—',
      actionLabel:
        entry.action === 'CREATE'
          ? 'Создание'
          : entry.action === 'ROLLBACK'
            ? 'Откат'
            : 'Изменение',
      descriptions,
    };
  });
}
