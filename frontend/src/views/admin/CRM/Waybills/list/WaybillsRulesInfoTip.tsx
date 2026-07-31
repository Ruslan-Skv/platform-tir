'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './WaybillsRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с путевым листом',
  note: 'Дневной список заданий водителю: планирование доставок, отметки о выполнении и привязка к договорам. Подходит ответственным менеджерам и водителям.',
} as const;

const DAY_ITEMS = [
  '«Дата от» и «Дата до» задают период — на экране задания за выбранные дни.',
  'По умолчанию открывается неделя начиная с сегодня; сузьте или расширьте период фильтрами «Дата от/до».',
  'Путевой лист на день желательно заполнить до 08:00. Правки после 08:00 подсвечиваются меткой «после 08:00».',
  'Чипы статуса («В плане», «Выполнено», «Не выполнено») быстро сужают список; «Все» показывает полный период.',
] as const;

const CREATE_ITEMS = [
  '«+ Задание» — создать строку: время, направление, текст задания, заказчик, стоимость и кто платит.',
  'Поиск по номеру договора подставляет ФИО, адрес и телефон в отдельные поля; при необходимости их можно поправить вручную.',
  'Назначьте ответственного и водителя — задание появится у водителя в разделе «Мой маршрут».',
] as const;

const STATUS_ITEMS = [
  'Водитель (или ответственный) отмечает «Выполнено» после доставки.',
  'Если доставка не состоялась — «Не выполнено» с обязательной причиной. Строку не удаляйте.',
  'Удалить («в корзину») можно только задание «В плане», и только тот, кто его вписал.',
  'Через 30 дней после перемещения в корзину задание удаляется безвозвратно.',
  'Выполненные задания удалять нельзя.',
  '«В план» возвращает выполненное или невыполненное задание обратно в работу.',
] as const;

const DRIVER_ITEMS = [
  'Раздел «Мой маршрут» — карточки заданий водителя на выбранный день.',
  'В карточке удобно позвонить клиенту и открыть адрес на карте.',
  'Отметку о выполнении водитель ставит сам — ответственному не нужно править таблицу за него.',
] as const;

const RULES_ITEMS = [
  'Избегайте узких временных окон (например, только с 17:00 до 18:00) — лучше «по созвону за час».',
  'Планируйте доставки с учётом уже стоящих на день, без больших разрывов и наложений по времени.',
  'Направление (двери, бавария и т.п.) помогает быстро понять тип выезда.',
] as const;

export function WaybillsRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>День и фильтры</p>
            <ul className={styles.list}>
              {DAY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Создание задания</p>
            <ul className={styles.list}>
              {CREATE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статусы и отметки</p>
            <ul className={styles.list}>
              {STATUS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Мой маршрут</p>
            <ul className={styles.list}>
              {DRIVER_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Правила планирования</p>
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
