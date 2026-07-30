'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './MeasurementFormRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с карточкой замера',
  note: 'Карточка замера: бланк приёма, заказчик, статусы и результаты по направлениям. Данные на сервер уходят только по кнопке «Сохранить замер» — автосохранения нет.',
} as const;

const BLANK_ITEMS = [
  '«Бланк замера» — менеджер, даты, направление, заказчик из базы (поиск), адрес объекта и телефон.',
  'Заказчика выбирают через поиск в справочнике; при необходимости можно добавить новую карточку клиента.',
  'Обязательные поля нужно заполнить до первого сохранения — иначе появится тост с понятной ошибкой.',
] as const;

const SAVE_ITEMS = [
  '«Сохранить замер» справа вверху (на телефоне — на всю ширину) создаёт новый замер или обновляет существующий.',
  'После успешного сохранения — зелёный тост; при ошибке или незаполненных полях — красный с текстом причины.',
  'Смена статуса в списке тоже записывается только после «Сохранить замер».',
] as const;

const STATUS_ITEMS = [
  'Статусы: Новый, Выполнен, Отказ, Договор — можно выбрать вручную.',
  '«Выполнен» также ставится автоматически, когда зафиксированы вкладки результатов по всем выбранным направлениям.',
  'Подсказка у поля «Статус» кратко объясняет порядок статусов.',
] as const;

const RESULTS_ITEMS = [
  '«Заполнить результаты замеров» открывает блок результатов по направлениям (на узком экране блок может быть скрыт).',
  'Сначала сохраните бланк кнопкой вверху — иначе фиксация вкладки недоступна.',
  '«Зафиксировать вкладку» закрывает направление для правок и учитывается в статусе «Выполнен»; «Отменить фиксацию» снова открывает редактирование.',
] as const;

const OTHER_ITEMS = [
  'Журнал событий (иконка часов) — история изменений по уже сохранённому замеру.',
  '«← К списку замеров» возвращает в общий список с фильтрами и областями «Мои» / «Мои направления» / «Все».',
] as const;

export function MeasurementFormRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Бланк замера</p>
            <ul className={styles.list}>
              {BLANK_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Сохранение</p>
            <ul className={styles.list}>
              {SAVE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статус</p>
            <ul className={styles.list}>
              {STATUS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Результаты по направлениям</p>
            <ul className={styles.list}>
              {RESULTS_ITEMS.map((item) => (
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
