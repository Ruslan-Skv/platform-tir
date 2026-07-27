'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './MeasurementsListRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с замерами',
  note: 'Общий список замеров для менеджеров, ведущих специалистов и бригадира: области видимости, статусы и фильтры помогают не теряться в большом потоке.',
} as const;

const SCOPE_ITEMS = [
  '«Мои» — замеры, где вы ответственный менеджер или назначенный замерщик.',
  '«Мои направления» — замеры по направлениям, назначенным вам в карточке пользователя (Пользователи).',
  '«Все» — полный список в рамках прав доступа к разделу.',
] as const;

const STATUS_ITEMS = [
  'Чипы статусов: Новый, Выполнен, Отказ, Договор — быстро сужают список; «Все статусы» снимает фильтр.',
  'Счётчики на чипах показывают число замеров в текущей области и прочих фильтрах.',
  'Статус меняется на карточке замера; «Выполнен» может выставляться автоматически по результатам направлений.',
] as const;

const FILTER_ITEMS = [
  'Поиск — по ФИО, адресу, телефону и комментарию.',
  'Менеджер — доступен вне области «Мои».',
  'Направление и даты приёма — дополнительная уточняющая фильтрация.',
  '«На странице» — сколько строк загружать за раз; листание внизу таблицы.',
  'Панель настроек можно свернуть: в свёрнутом виде видны активные фильтры; «Изменить» снова раскрывает поля.',
] as const;

const WORK_ITEMS = [
  'Клик по строке открывает карточку замера.',
  'Колонка связей показывает, создан ли расчёт и договор по замеру.',
  '«+ Новый замер» — создание записи; обновление — перезагрузка списка с сервера.',
] as const;

const ROLE_ITEMS = [
  'Менеджерам и замерщикам при первом заходе удобнее область «Мои».',
  'Ведущим и бригадиру — «Мои направления».',
  'Направления назначает администратор в карточке пользователя; без них «Мои направления» будет пустым.',
] as const;

export function MeasurementsListRulesInfoTip() {
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
            <p className={styles.sectionTitle}>Статусы</p>
            <ul className={styles.list}>
              {STATUS_ITEMS.map((item) => (
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
            <p className={styles.sectionTitle}>Работа с замером</p>
            <ul className={styles.list}>
              {WORK_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Роли и направления</p>
            <ul className={styles.list}>
              {ROLE_ITEMS.map((item) => (
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
