'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './EstimateWorkspaceRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с расчётом',
  note: 'Рабочая область сметного расчёта: категории работ, заказчик, калькулятор позиций и сохранение. Подходит для нового расчёта, копии, расчёта из замера и правки существующего.',
} as const;

const HEADER_ITEMS = [
  '«← К списку расчётов» — возврат к общему списку; при несохранённых правках сначала спросит подтверждение выхода.',
  'Заголовок меняется в зависимости от режима: новый расчёт, копия, из замера, связанный экземпляр или редактирование.',
  '«Сохранить расчёт» / «Сохранить изменения» и «Выйти без сохранения» появляются после правок (на телефоне — на всю ширину).',
] as const;

const TOP_ITEMS = [
  'Категории — отметьте одну или несколько чипами; без категории калькулятор недоступен.',
  'Название расчёта обязательно; заказчика и адрес объекта выбирают через поиск в базе клиентов.',
  'При необходимости можно добавить новую карточку клиента прямо из панели поиска.',
] as const;

const CALC_ITEMS = [
  'Ниже — калькулятор выбранных категорий: вкладки по категориям, позиции, количества и суммы.',
  'Переключение вкладки категории синхронизирует комнаты/позиции для этой категории.',
  'Для категории «Прочие» доступны произвольные позиции работ.',
] as const;

const SAVE_ITEMS = [
  'Данные уходят на сервер только по кнопке сохранения — автосохранения нет.',
  'Перед сохранением заполните название и заказчика; иначе покажется ошибка у поля или вверху страницы.',
  '«Выйти без сохранения» отменяет несохранённые правки и возвращает к списку (или к состоянию на момент открытия).',
] as const;

const SPECIAL_ITEMS = [
  '«Из замера» — позиции и данные подтягиваются из выполненного замера с разделами помещений.',
  'Копия и «связанный экземпляр» — для разделения сметы на несколько договоров; позиции отмечают в «Разделении сметы» у каждого экземпляра.',
  'Если расчёт уже прикреплён к смете договора или Д/с, при правке система предупредит: привязку снимут, потом нужно заново прикрепить в пакете.',
] as const;

export function EstimateWorkspaceRulesInfoTip() {
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
            <p className={styles.sectionTitle}>Категории и заказчик</p>
            <ul className={styles.list}>
              {TOP_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Калькулятор</p>
            <ul className={styles.list}>
              {CALC_ITEMS.map((item) => (
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
            <p className={styles.sectionTitle}>Особые режимы</p>
            <ul className={styles.list}>
              {SPECIAL_ITEMS.map((item) => (
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
