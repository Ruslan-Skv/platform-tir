'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './LeadsInboxRulesInfoTip.module.css';

type LeadsInboxRulesInfoTipProps = {
  variant?: 'inbox' | 'director';
};

const INBOX_HELP = {
  title: 'Как работать со входящими заявками',
  note: 'Единый список обращений с сайта и связанных форм: замер, обратный звонок, квизы, заказы, обратная связь. Подходит менеджерам и администраторам для первичной обработки лидов.',
} as const;

const DIRECTOR_HELP = {
  title: 'Как работать с письмами директору',
  note: 'Отдельная очередь сообщений из формы «Письмо директору». Здесь те же статусы и заметки, без фильтра по другим источникам заявок.',
} as const;

const FILTER_ITEMS = [
  'Чипы «Статус» быстро сужают список: Новая, Связались, В работе, Завершена, Отменена. «Все» сбрасывает фильтр.',
  'Чипы «Источник» (на десктопе) или выпадающий список (на телефоне) оставляют заявки одного канала — замер, квиз, заказ и т.д.',
  'Поиск — по имени, телефону и email; Enter или «Найти» применяют строку.',
  'Счётчики на чипах показывают, сколько заявок в каждой выборке при текущих остальных фильтрах.',
] as const;

const DIRECTOR_FILTER_ITEMS = [
  'Чипы «Статус» быстро сужают список: Новая, Связались, В работе, Завершена, Отменена. «Все» сбрасывает фильтр.',
  'Поиск — по имени, телефону и email; Enter или «Найти» применяют строку.',
  'Счётчики на чипах показывают, сколько писем в каждой выборке при текущих остальных фильтрах.',
] as const;

const CARD_ITEMS = [
  'В карточке: источник, имя, текущий статус, контакты, дата и краткий текст заявки.',
  '«Открыть раздел →» ведёт в связанный объект (заказ, квиз и т.п.), если он есть.',
  'Статус меняется в списке прямо в карточке. У части заявок (например, заказ из каталога) статус правится только на странице заказа.',
  '«Заметка менеджера» — внутренний комментарий для коллег; сохраняется иконкой галочки рядом с полем.',
] as const;

const ACTIONS_ITEMS = [
  'Кнопка обновления в шапке перезагружает список с сервера.',
  'Удаление доступно супер-администратору: иконка корзины в карточке, с подтверждением. Восстановить заявку нельзя.',
  'Если страниц несколько, листание — «Назад» / «Вперёд» внизу списка.',
] as const;

const STATUS_FLOW_ITEMS = [
  'Новая — ещё не обработана.',
  'Связались — контакт состоялся.',
  'В работе — ведётся дальнейшая работа по заявке.',
  'Завершена — обращение закрыто успешно.',
  'Отменена — отказ или неактуально.',
] as const;

export function LeadsInboxRulesInfoTip({ variant = 'inbox' }: LeadsInboxRulesInfoTipProps) {
  const isDirector = variant === 'director';
  const help = isDirector ? DIRECTOR_HELP : INBOX_HELP;

  return (
    <AdminHelpTooltip
      title={help.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{help.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Фильтры и поиск</p>
            <ul className={styles.list}>
              {(isDirector ? DIRECTOR_FILTER_ITEMS : FILTER_ITEMS).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Карточка заявки</p>
            <ul className={styles.list}>
              {CARD_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статусы</p>
            <ul className={styles.list}>
              {STATUS_FLOW_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Действия</p>
            <ul className={styles.list}>
              {ACTIONS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      }
    >
      <AdminHelpInfoButton title={help.title} aria-label={help.title} />
    </AdminHelpTooltip>
  );
}
