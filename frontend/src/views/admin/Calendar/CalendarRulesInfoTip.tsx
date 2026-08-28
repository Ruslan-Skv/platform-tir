'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './CalendarRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с календарём',
  note: 'Единый мастер-календарь компании: монтажи, доставки, замеры, договоры, рабочие дни и свои события — в одном месячном виде.',
} as const;

const ITEMS = [
  'Переключайте месяц стрелками. Сегодняшняя дата подсвечена в сетке.',
  'Наведите курсор на событие — справа под ним откроется карточка с деталями.',
  'Клик по событию открывает связанный раздел (график монтажей, накладные и т.д.).',
  'Кнопка «+» в ячейке дня или «+ Событие» в шапке создаёт пользовательское событие; выбранные сотрудники получат уведомление в колокольчик.',
  'Фильтры сверху включают и выключают типы событий.',
] as const;

export function CalendarRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>
          <ul className={styles.list}>
            {ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      }
    >
      <AdminHelpInfoButton title={HELP.title} aria-label={HELP.title} />
    </AdminHelpTooltip>
  );
}
