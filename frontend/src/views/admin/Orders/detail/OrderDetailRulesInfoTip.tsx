'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './OrderDetailRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с карточкой заказа',
  note: 'Карточка товарного заказа: статус и действия менеджера, данные клиента, состав, доставка и сохранение правок. Открывается из общего списка заказов.',
} as const;

const HEADER_ITEMS = [
  '«← К списку заказов» — возврат к списку с фильтрами и чипами типов.',
  'Справа в шапке: история заказа, обновление с сервера; у суперадмина — перемещение в корзину.',
  '«Сохранить изменения» записывает правки клиента, комментарии к позициям и параметры доставки (на телефоне кнопка короче — «Сохранить»).',
] as const;

const STATUS_ITEMS = [
  'Текущий статус показан под заголовком; у «На проверку» рядом идёт таймер ожидания проверки.',
  '«Заказ проверен» — покупатель может оплатить; статус ограничен по времени (после истечения заказ отменяется, товары остаются в корзине).',
  '«На доработку» — вернуть заказ покупателю с комментариями к позициям; без комментариев к товарным позициям кнопка недоступна.',
  'Дальше по цепочке: «В обработке» → «Отправлен» → «Доставлен»; при необходимости — отмена заказа.',
  '«Отправить на email» доступно после проверки, если ещё не отправляли — покупатель получает письмо для ознакомления и оплаты.',
] as const;

const CLIENT_ITEMS = [
  'Блок «Клиент» — ФИО, телефон и email; правки сохраняются кнопкой в шапке.',
  'Менеджер в заголовке назначается при обработке; «ещё не назначен» — заказ никто не взял в работу.',
] as const;

const ITEMS_ITEMS = [
  '«Состав заказа» — позиции, цены и суммы; у позиций можно оставить комментарий менеджера (нужен для отправки на доработку).',
  'Итоговая сумма пересчитывается с учётом доставки, если она есть у заказа.',
] as const;

const DELIVERY_ITEMS = [
  'Блок «Доставка» появляется у заказов с доставкой: стоимость доставки/заноса, грузчики, плановая дата.',
  'Изменения по доставке тоже уходят на сервер только после «Сохранить изменения».',
] as const;

const OTHER_ITEMS = [
  'История (иконка часов) — журнал событий по заказу.',
  'Обновление перечитывает заказ с сервера; несохранённые правки в форме могут пропасть.',
  'Корзина — только для суперадмина; восстановить заказ можно из корзины в списке заказов.',
] as const;

export function OrderDetailRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Шапка</p>
            <ul className={styles.list}>
              {HEADER_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статус и действия</p>
            <ul className={styles.list}>
              {STATUS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Клиент</p>
            <ul className={styles.list}>
              {CLIENT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Состав</p>
            <ul className={styles.list}>
              {ITEMS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Доставка</p>
            <ul className={styles.list}>
              {DELIVERY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Прочее</p>
            <ul className={styles.list}>
              {OTHER_ITEMS.map((item) => (
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
