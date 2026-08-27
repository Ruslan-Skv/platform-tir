'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './KanbanRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с канбан-доской',
  note: 'Доски задач команды: колонки с WIP-лимитами, карточки с приоритетами, сроками, исполнителями, чек-листами и обсуждениями. Подходит для ведения процессов без отдельных чатов и таблиц.',
} as const;

const BOARD_ITEMS = [
  'В шапке видно название текущей доски и число карточек. Переключайте доски в фильтре «Доска».',
  '«Новая доска» создаёт пространство с колонками «Бэклог → В работе → На проверке → Готово».',
  '«Переименовать» меняет название и описание доски. «Удалить доску» перемещает доску в корзину вместе с колонками и карточками.',
  'Иконка корзины в шапке открывает список удалённых досок; оттуда можно восстановить доску.',
  'Через 30 дней после перемещения в корзину доска удаляется безвозвратно.',
  'Кнопка обновления в шапке перезагружает список досок и текущую доску с сервера.',
] as const;

const COLUMN_ITEMS = [
  'Колонки — этапы процесса. Цветная точка и счётчик показывают этап и загрузку.',
  'WIP-лимит ограничивает число карточек в колонке; при превышении счётчик подсвечивается.',
  '«Колонка» в шапке добавляет новый этап. Шестерёнка меняет название, цвет и WIP.',
  'Кнопка «×» на колонке видна только если колонка пустая и на доске есть ещё хотя бы одна колонка.',
  'Удалять и настраивать колонки могут пользователи с правом редактирования раздела «Канбан-доска» (не только просмотр).',
] as const;

const ACCESS_ITEMS = [
  'Просмотр — смотреть доски и карточки без изменений.',
  'Редактирование — создавать/переименовывать/удалять доски (в корзину), управлять колонками и карточками.',
  'Права выдаются в сайдбаре через «Доступ» у пункта «Канбан-доска» или ролью по умолчанию.',
] as const;

const CARD_ITEMS = [
  '«+ Карточка» быстро добавляет задачу в колонку. Карточку можно перетащить в другую колонку или изменить порядок.',
  'Клик по карточке открывает карточку: описание, приоритет, срок, исполнитель, метки, чек-лист и комментарии.',
  'Вкладка «Чат задачи» — отдельный командный тред карточки (мессенджер), не смешивается с комментариями.',
  'Приоритеты: низкий, средний, высокий, срочный. Просроченный срок подсвечивается на карточке.',
] as const;

const FILTER_ITEMS = [
  'Поиск ищет по названию, описанию и меткам карточек.',
  'Фильтры «Приоритет», «Исполнитель» и «Метка» сужают список на доске без изменения самих данных.',
] as const;

export function KanbanRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Доски</p>
            <ul className={styles.list}>
              {BOARD_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Колонки</p>
            <ul className={styles.list}>
              {COLUMN_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Доступ</p>
            <ul className={styles.list}>
              {ACCESS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Карточки</p>
            <ul className={styles.list}>
              {CARD_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Фильтры</p>
            <ul className={styles.list}>
              {FILTER_ITEMS.map((item) => (
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
