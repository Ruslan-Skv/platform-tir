'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './CustomersListRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с заказчиками',
  note: 'Справочник заказчиков и клиентов: очередь «Мои» / «Все», типы карточек, поиск и связь с замерами и договорами. Выбранная область и фильтры сохраняются между заходами.',
} as const;

const SCOPE_ITEMS = [
  '«Мои» — карточки, которые создали вы (удобно менеджерам в ежедневной работе).',
  '«Все» — полный справочник в рамках прав доступа к разделу.',
  'Менеджерам, технологам и замерщикам при первом заходе открывается «Мои».',
] as const;

const LIST_ITEMS = [
  'В списке — и отдельные карточки клиентов, и заказчики, которые пока встречаются только в договорах (без своей карточки).',
  'Клик по строке или карточке открывает карточку клиента либо просмотр данных «только из договоров».',
  'Повторный клик по выбранной строке снимает выделение.',
] as const;

const TYPE_ITEMS = [
  'Типы: ФЛ (физлицо), ИП, ЮЛ (организация).',
  'Чип «Все типы» показывает весь справочник; остальные сужают список.',
] as const;

const FILTER_ITEMS = [
  'Поиск — по ФИО, телефону, e-mail, компании и адресу.',
  'Автор — доступен в области «Все»; кто создал карточку или «Без автора».',
  '«На странице» — сколько строк загружать за раз; листание внизу таблицы (на телефоне — карточки).',
  'Панель настроек можно свернуть: в свёрнутом виде видны активные фильтры; «Изменить» снова раскрывает поля.',
] as const;

const WORK_ITEMS = [
  '«+ Новый заказчик» — создание карточки в справочнике.',
  'В карточке можно править данные, смотреть историю и связанные замеры/договоры.',
  'Удаление отправляет карточку в корзину; оттуда её можно восстановить.',
  'Обновление — перезагрузка списка с сервера.',
] as const;

const COLUMNS_ITEMS = [
  'Колонки показывают дату создания, контакты, последний замер и договор, число договоров и сумму.',
  'Сортировка по отдельным колонкам — кликом по заголовку таблицы.',
] as const;

export function CustomersListRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Область списка</p>
            <ul className={styles.list}>
              {SCOPE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Список</p>
            <ul className={styles.list}>
              {LIST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Типы</p>
            <ul className={styles.list}>
              {TYPE_ITEMS.map((item) => (
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

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Работа с карточкой</p>
            <ul className={styles.list}>
              {WORK_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Таблица</p>
            <ul className={styles.list}>
              {COLUMNS_ITEMS.map((item) => (
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
