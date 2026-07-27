'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './EstimatesListRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с расчётами',
  note: 'Список сметных расчётов для оформления договоров: поиск, очереди, группировка по объектам и действия со строками. Подходит менеджерам и смежным ролям.',
} as const;

const SCOPE_ITEMS = [
  '«Мои» — расчёты, которые вы создали, или привязанные к договорам, где вы ответственный менеджер.',
  '«Все» — полный список в рамках прав доступа к разделу; фильтр «Менеджер» доступен только здесь.',
  'Менеджерам при первом заходе удобнее область «Мои», чтобы не путаться в большом общем списке.',
] as const;

const PIPELINE_ITEMS = [
  '«В работе» — актуальные расчёты для оформления и ведения сделок.',
  '«В перспективе» — отложенные варианты; можно вернуть обратно во «В работе».',
  'Счётчики на вкладках показывают, сколько расчётов в каждой очереди.',
] as const;

const FILTER_ITEMS = [
  'Поиск — по названию расчёта, заказчику и адресу объекта.',
  '«По объектам» / «Плоский список» — группировка по адресу или все расчёты подряд.',
  'Даты и менеджер — дополнительная фильтрация (менеджер — в режиме «Все»).',
  '«На странице» — сколько строк показывать; листание внизу таблицы.',
] as const;

const VIEW_ITEMS = [
  '«По объектам» — тёплая карточка объекта, внутри по «+» / «−» связанные расчёты.',
  'Расчёты без адреса показываются отдельными карточками со скруглением.',
  '«Плоский список» — каждый расчёт отдельной карточкой, без группировки.',
] as const;

const WORK_ITEMS = [
  'В строке: перспектива/работа, архив, редактирование, копирование, разделение сметы, корзина.',
  'Наценка (%) — доп. процент к позициям; у объекта действует на все расчёты адреса в группе, у расчёта — только на него.',
  '«+ Новый расчёт» открывает рабочую область; «из замера» — создать расчёт по выполненному замеру.',
  'Архив скрывает расчёты из основного списка и из выбора при оформлении договоров; корзина — для удаления с возможностью восстановления.',
] as const;

const BINDING_ITEMS = [
  'Привязка к договору отображается в колонке использования; у подписанного договора или Д/с правка и удаление могут быть недоступны.',
  'Разделение сметы нужно, когда один расчёт делится на несколько связанных экземпляров под разные договоры.',
] as const;

export function EstimatesListRulesInfoTip() {
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
            <p className={styles.sectionTitle}>Вкладки</p>
            <ul className={styles.list}>
              {PIPELINE_ITEMS.map((item) => (
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
            <p className={styles.sectionTitle}>Работа с расчётом</p>
            <ul className={styles.list}>
              {WORK_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Привязки и разделение</p>
            <ul className={styles.list}>
              {BINDING_ITEMS.map((item) => (
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
