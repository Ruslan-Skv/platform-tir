'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './OrdersListRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать со списком заказов',
  note: 'Общий список заказов интернет-магазина: товары, услуги и доставка. Поиск, фильтры и работа со строками для менеджеров и администраторов.',
} as const;

const KIND_ITEMS = [
  '«Все» — товарные и сервисные заказы в одном списке (пометка «услуги» у сервисных).',
  '«Товары» — только заказы каталога / магазина.',
  '«Услуги» — отдельные заказы на услуги; часть фильтров (клиент, менеджер, даты, оплата) для них недоступна.',
  '«Доставка» — товарные заказы с доставкой (адрес или стоимость доставки).',
  'Счётчики на чипах показывают, сколько заказов сейчас в этой выборке.',
] as const;

const STATUS_PAYMENT_ITEMS = [
  'Статус — этап заказа; набор чипов зависит от типа (у услуг свои статусы).',
  'Оплата — для товарных заказов: ожидают / оплачены / возвраты.',
  '«Все» на чипах снимает фильтр по статусу или оплате.',
] as const;

const PROCESS_ITEMS = [
  'Покупатель оформляет заказ из корзины — он попадает «На проверку».',
  'Менеджер открывает карточку: сверяет состав, цены, доставку; при необходимости правит позиции и оставляет комментарии.',
  '«Заказ проверен» — покупатель может оплатить и завершить оформление; время действия статуса ограничено (после истечения заказ отменяется, товары остаются в корзине покупателя).',
  '«На доработке» — менеджер возвращает заказ покупателю с комментарием; после правок покупатель снова отправляет на проверку.',
  'Дальше по цепочке: «В обработке» → «Отправлен» → «Доставлен»; при необходимости — отмена или возврат.',
  'Заказы на услуги проще: «Ожидает» → «Подтверждён» или «Отменён»; оплата в списке для них не ведётся.',
] as const;

const FILTER_ITEMS = [
  'Поиск — по номеру заказа, клиенту и менеджеру (для товарных заказов и режима «Все»).',
  'Даты от / до — по дате создания заказа.',
  'Панель «Настройки списка» можно свернуть: видны только активные фильтры; «Изменить» снова раскрывает чипы.',
] as const;

const WORK_ITEMS = [
  'Клик по заголовку колонки сортирует список; выбранная сортировка сохраняется в браузере.',
  'Клик по строке (или карточке на мобиле) открывает карточку заказа.',
  'Обновление — перезагрузка списка с сервера.',
  'Корзина (только суперадмин) — удалённые заказы; из строки — иконка «в корзину» с подтверждением.',
  'Восстановить заказ можно из корзины в шапке.',
] as const;

export function OrdersListRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Тип заказов</p>
            <ul className={styles.list}>
              {KIND_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статус и оплата</p>
            <ul className={styles.list}>
              {STATUS_PAYMENT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Обработка заказа</p>
            <ul className={styles.list}>
              {PROCESS_ITEMS.map((item) => (
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
            <p className={styles.sectionTitle}>Работа со списком</p>
            <ul className={styles.list}>
              {WORK_ITEMS.map((item) => (
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
