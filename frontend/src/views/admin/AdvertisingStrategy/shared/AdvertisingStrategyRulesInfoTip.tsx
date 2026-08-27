'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './AdvertisingStrategyRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с рекламной стратегией',
  note: 'Раздел для планирования продвижения: общий месячный бюджет, каналы с приоритетами и долями, текстовое описание стратегии и ежедневная статистика для расчёта ROI.',
} as const;

const TABS_ITEMS = [
  '«Обзор стратегии» — сводка, диаграммы, редактирование общего бюджета и долей каналов, описание стратегии.',
  '«Каналы продвижения» — справочник каналов: приоритет, бюджет, роль, активность. Здесь добавляют и отключают каналы.',
  '«Статистика каналов» — ввод факта по дням (визиты, лиды, заказы, выручка, затраты) и сводка за период.',
] as const;

const BUDGET_ITEMS = [
  'Задайте «Общий бюджет / мес» — это плановая сумма на все каналы. Комментарий к бюджету необязателен.',
  'В таблице каналов меняйте сумму в ₽ или долю в %: второе поле пересчитается от общего бюджета.',
  'Сохраните бюджет, чтобы зафиксировать план. Подсказка покажет остаток или перерасход относительно общей суммы.',
  'Для полного распределения сумма долей активных каналов должна быть около 100%.',
  'Неактивные каналы в распределении не участвуют — их бюджет и доля не редактируются на обзоре.',
] as const;

const STRATEGY_ITEMS = [
  'Блок «Описание стратегии» хранит название, суть, цели/KPI и заметки — это текстовый план для команды.',
  'После правок нажмите «Сохранить описание».',
] as const;

const CHANNELS_ITEMS = [
  '«+ Добавить канал» — новый канал с кодом, приоритетом, месячным бюджетом (или долей), ролью и описанием.',
  'Приоритет задаёт порядок в списках и на диаграммах (меньше число — выше в списке).',
  'Код канала лучше не менять без необходимости: по нему удобно различать каналы в данных.',
  'Выключенный канал скрывается из активного плана, но его история метрик сохраняется.',
] as const;

const METRICS_ITEMS = [
  'Укажите период «Дата от / Дата до» и обновите список — сводка и таблица пересчитаются.',
  'В форме выберите канал и дату, заполните визиты, лиды, заказы, выручку и затраты; сохраните запись.',
  'ROI и доли считаются по внесённым фактам: без статистики диаграммы «лиды» и «план vs факт» будут пустыми или нулевыми.',
  'Удаляйте ошибочные дневные записи из таблицы статистики — план бюджета при этом не меняется.',
] as const;

const RULES_ITEMS = [
  'Сначала зафиксируйте общий бюджет и доли на «Обзоре», затем ведите каналы и ежедневную статистику.',
  'Бюджет на обзоре — план; затраты в статистике — факт. Сравнивайте их на диаграмме «План vs факт».',
  'Держите 3–7 активных каналов с понятными ролями (охват, лиды, SEO, рефералы и т.п.), чтобы доли оставались управляемыми.',
  'Вносите статистику регулярно — иначе ROI и лиды по каналам не отражают реальную картину.',
] as const;

export function AdvertisingStrategyRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Разделы</p>
            <ul className={styles.list}>
              {TABS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Бюджет и доли</p>
            <ul className={styles.list}>
              {BUDGET_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Описание стратегии</p>
            <ul className={styles.list}>
              {STRATEGY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Каналы</p>
            <ul className={styles.list}>
              {CHANNELS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статистика</p>
            <ul className={styles.list}>
              {METRICS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Правила работы</p>
            <ul className={styles.list}>
              {RULES_ITEMS.map((item) => (
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
