'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './ContractsListRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать со списком договоров',
  note: 'Общий список договоров по всем направлениям: поиск, фильтры, очереди и работа с объектами. Подходит менеджерам, ведущим и бригадирам.',
} as const;

const SCOPE_ITEMS = [
  '«Мои» — договоры, где вы ответственный менеджер, подписант или создатель.',
  '«Мои направления» — договоры по направлениям, назначенным вам в карточке пользователя (Пользователи).',
  '«Все» — полный список в рамках ваших прав доступа к разделу.',
] as const;

const QUEUE_ITEMS = [
  'Чипы очереди быстро ставят фильтр по этапу: «В проекте», «В производство», «В работе», «Производство», «Закрытые», «Отказ».',
  'Статусы можно включать по несколько сразу — подойдёт своя комбинация этапов.',
  'Счётчики на чипах показывают, сколько договоров сейчас в этой выборке.',
] as const;

const FILTER_ITEMS = [
  'Направления — сужают список (например, Окна, Двери, Потолки). Пунктирная обводка — ваши направления.',
  'Поиск — по номеру договора, заказчику, адресу и другим полям списка.',
  'Даты и ответственный — дополнительная уточняющая фильтрация.',
  '«На странице» — сколько договоров загружать за раз; листание внизу таблицы.',
  'Панель настроек можно свернуть: в свёрнутом виде видны только включённые фильтры; кнопка «Изменить» снова раскрывает все чипы.',
] as const;

const VIEW_ITEMS = [
  '«По объектам» — договоры сгруппированы: зелёная карточка объекта, внутри — связанные договоры («+» / «−»).',
  'Договоры без объекта показываются отдельными карточками со скруглением, не внутри чужого объекта.',
  '«Плоский список» — все договоры подряд, без группировки по объектам.',
] as const;

const WORK_ITEMS = [
  'На компьютере клик по строке договора открывает пакет документов.',
  'На телефоне в пакет не заходим: смотрите список объектов/договоров и открывайте счета, заказ-наряды и «Оплаты и Управление» по иконкам в карточке.',
  'В строке на ПК: счета, хаб нарядов, оплаты/управление, «Поделиться» (документы заказчику), «ЭП» (дистанционное подписание), копирование и удаление черновика (если разрешено).',
  '«Поделиться» — выбрать документы и отправить PDF через Telegram, WhatsApp, MAX или почту без подписания.',
  '«ЭП» — создать ссылку и одноразовый код, отправить заказчику; после подтверждения на странице подписания договор отмечается подписанным. Под статусом может быть «На согласовании» / «Просмотрено заказчиком».',
  '«+ Новый договор» — создание пакета: выберите направление и заполните данные.',
  'Корзина — удалённые договоры; обновление — перезагрузка списка с сервера.',
] as const;

const COLUMNS_ITEMS = [
  'Иконка таблицы в шапке справа — открывает список полей таблицы (колонки).',
  'Отметьте галочкой нужные колонки (заказчик, адрес, оплачено, акты и т.д.) или снимите лишние, чтобы таблица была реже.',
  '«№ договора» всегда включён — его нельзя скрыть; колонка действий (хаб, копирование и др.) тоже всегда на месте.',
  'Порядок колонок в таблице фиксированный; меняется только набор видимых полей.',
  'Выбор сохраняется в этом браузере и восстанавливается при следующем заходе.',
] as const;

const VIEWS_ITEMS = [
  'Блок «Виды» сохраняет текущие фильтры и область видимости в этом браузере.',
  'Сохраните удобную выборку (например, «Мои · В производство · Окна») и возвращайтесь к ней одним кликом.',
  'Представление можно переименовать или удалить.',
] as const;

const ROLE_NOTE_ITEMS = [
  'Менеджерам при первом заходе удобнее область «Мои».',
  'Ведущим и бригадирам — «Мои направления» и очередь «Производство» (подписан + в работе).',
  'Направления назначает администратор в карточке пользователя; без них «Мои направления» будет пустым.',
] as const;

export function ContractsListRulesInfoTip() {
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
            <p className={styles.sectionTitle}>Очереди и статусы</p>
            <ul className={styles.list}>
              {QUEUE_ITEMS.map((item) => (
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
            <p className={styles.sectionTitle}>Вид списка</p>
            <ul className={styles.list}>
              {VIEW_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Работа с договором</p>
            <ul className={styles.list}>
              {WORK_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Колонки таблицы</p>
            <ul className={styles.list}>
              {COLUMNS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Сохранённые виды</p>
            <ul className={styles.list}>
              {VIEWS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Роли и направления</p>
            <ul className={styles.list}>
              {ROLE_NOTE_ITEMS.map((item) => (
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
