'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './DpRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с журналом ДП',
  note: 'Журнал денежных потоков компании: оплаты по договорам попадают сюда автоматически, ручные проводки добавляются кнопкой «+ Запись». Над таблицей — итоги продаж за период, рядом — фильтры, инкассация и детальная статистика.',
} as const;

const ENTRY_ITEMS = [
  '«Авто» — записи по оплатам договоров из «Оплаты и Управление договором»: появляются сами, правке в журнале не подлежат.',
  '«Ручн.» — ручные проводки: изъятие из кассы (например, на бытовые нужды) или внесение сумм вне оплат по договорам.',
  'Колонки «№ договора», «Заказчик» и «Направление» у ручных записей заполняются в модалке «+ Запись».',
] as const;

const DIRECTION_ITEMS = [
  'Направление обязательно: направление договора (Ремонт, Окна, Двери, Потолки, Жалюзи, Мебель), «Материалы» или «Прочее».',
  'Направления и «Материалы» — это продажи: учитываются в «Итого за период» и в показателях менеджеров; для них заполняются «№ договора» и «Заказчик».',
  '«Прочее» — движения денег вне продаж и договоров (покупка хоз. товаров и т.п.): не увеличивает и не уменьшает ни итоговые продажи, ни продажи менеджеров.',
  'Суммы «Прочее» видны отдельной плиткой «Прочее» без процента к продажам.',
  'Наличные записи «Прочее» всё равно участвуют в остатке кассы менеджера для инкассации — это реальные деньги.',
] as const;

const TOTALS_ITEMS = [
  '«Итого за период» — итоговые продажи за выбранный период (без «Прочее»).',
  'Плитки показывают разбивку по направлениям; переключатель «Панель итогов» — по менеджерам.',
  'На плитках менеджеров строка «Касса: …» — наличные менеджера к инкассации на текущий момент (с момента последней инкассации; от периода не зависит).',
  'Иконка статистики рядом с «+ Запись» — детальная статистика за период: графики по менеджерам и по направлениям.',
  'Фильтры: период, менеджер («Мои»/«Все»), направление, тип записи (Авто/Ручные), способ оплаты и поиск по № договора, заказчику, основанию.',
] as const;

const MANUAL_ITEMS = [
  '«+ Запись» — тип операции (изъятие/внесение), менеджер кассы, направление, сумма, способ, дата и основание обязательны.',
  'Наличные записи меняют остаток наличных менеджера с момента последней инкассации.',
] as const;

const EDIT_ITEMS = [
  'Редактировать ручные записи может только супер-админ — кнопка-карандаш в конце строки (исправление ошибок других пользователей).',
  'Изменённые поля помечены маленьким карандашом: при наведении видно первоначальное значение («Было: …»).',
  'Если поле вернули к первоначальному значению — пометка снимается.',
  'Автоматические записи по оплатам не редактируются: правьте оплату в карточке договора.',
] as const;

const INCASSATION_ITEMS = [
  '«+ Инкассация» — сдача наличных из кассы менеджера; остаток считается с момента последней инкассации.',
  'Иконка часов рядом — история последних инкассаций.',
] as const;

export function DpRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Записи журнала</p>
            <ul className={styles.list}>
              {ENTRY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Направление записи</p>
            <ul className={styles.list}>
              {DIRECTION_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Итоги и статистика</p>
            <ul className={styles.list}>
              {TOTALS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Ручная запись</p>
            <ul className={styles.list}>
              {MANUAL_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Правка и пометки</p>
            <ul className={styles.list}>
              {EDIT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Инкассация</p>
            <ul className={styles.list}>
              {INCASSATION_ITEMS.map((item) => (
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
