'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './MyWorkDayRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с моим рабочим днём',
  note: 'Личный журнал явки: статус сегодня, запросы выходного, позднего прихода и раннего ухода, история за период. Подходит сотрудникам с учётом рабочего времени.',
} as const;

const TODAY_ITEMS = [
  'Блок «Сегодня» показывает, начат ли рабочий день, есть ли опоздание или согласованный выходной / поздний приход / ранний уход.',
  'Начать и завершить день обычно нужно через виджет учёта при входе в админку (по правилам офиса и IP).',
  'Если на сегодня одобрен выходной, явка не требуется — админка доступна без старта дня.',
] as const;

const REQUEST_ITEMS = [
  '«Запросить выходной» — отправить дату на согласование руководителю. После подтверждения день считается нерабочим.',
  '«Прийти попозже» — указать желаемое время прихода; после одобрения можно начать день позже без штрафа за опоздание.',
  '«Уйти пораньше» — указать желаемое время ухода; после одобрения можно завершить день раньше смены без штрафа за ранний уход.',
  '«Отлучиться» — отметить уход с офиса на объект или по делам (нужен открытый рабочий день). В журнале фиксируются интервалы и причина. По возвращении — «Вернуться».',
  'Пока запрос в статусе «Ожидает», второй такой же тип на ту же дату создать нельзя; ожидающий запрос можно отменить в списке.',
  'Отклонённый запрос на учёт дня не влияет — можно отправить новый.',
] as const;

const LIST_ITEMS = [
  '«Мои запросы» — ваши заявки за выбранный период со статусами: ожидает, подтверждён, отклонён, отменён.',
  'Фильтры «Дата от» / «Дата до» сужают и запросы, и таблицу истории дней.',
  'Чипы сверху — сводка за период: рабочие дни, опоздания, ранние уходы, авто-закрытия, время «по делам».',
] as const;

const JOURNAL_ITEMS = [
  'Таблица — история ваших рабочих дней: приход, уход, опоздание, ранний уход, отлучения «по делам» (время и куда), статус.',
  'Кнопка обновления в шапке перезагружает статус, запросы и журнал с сервера.',
] as const;

export function MyWorkDayRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Сегодня</p>
            <ul className={styles.list}>
              {TODAY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Запросы</p>
            <ul className={styles.list}>
              {REQUEST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Список и фильтры</p>
            <ul className={styles.list}>
              {LIST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Журнал</p>
            <ul className={styles.list}>
              {JOURNAL_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      }
    >
      <AdminHelpInfoButton title={HELP.title} aria-label={HELP.title} />
    </AdminHelpTooltip>
  );
}
