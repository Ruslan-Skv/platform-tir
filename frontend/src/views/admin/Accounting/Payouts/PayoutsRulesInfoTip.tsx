'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './PayoutsRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с выплатами з/п',
  note: 'Единый журнал выплат зар/платы вне заказ-нарядов: сотрудникам (включая менеджеров по банку) и сторонним лицам. Объединяет записи этого раздела и ручные записи ДП с основанием «Зар/плата». Над таблицей — итоги выплат за период, рядом — фильтры.',
} as const;

const ENTRY_ITEMS = [
  'Записи раздела создаёт кнопка «+ Выплата»: получатель, сумма, дата, способ (наличные/банк) и категория.',
  'Записи с подписью «Запись журнала ДП» — ручные записи ДП с основанием «Зар/плата», которые менеджеры проводят сами; их не создаёт и не правит этот раздел.',
  'Выплаты мастерам здесь не учитываются — они живут в разделе «Расчёт мастеров», привязаны к заказ-нарядам договоров.',
] as const;

const RECIPIENT_ITEMS = [
  'Получатель — сотрудник из справочника (можно выбрать любого, не только менеджера кассы) или «другое лицо» с ФИО вручную — для людей, которых нет в справочниках.',
  'ФИО получателя сохраняется снимком на момент выплаты: переименование или удаление сотрудника не меняет историю выплат.',
  'Плитки итогов по получателям суммируют оба источника журнала.',
] as const;

const METHOD_ITEMS = [
  'Наличные выплаты раздела попадают в «Кассу» сразу: со знаком минус, основание «Зар/плата», ФИО получателя — в колонке «Зар/плата».',
  'Записи ДП «Зар/плата» наличными попадают в кассу только после сверки супер-админом (золотая печать в журнале ДП).',
  'Безналичные выплаты видны в разделе «Банк» строками «Выплата з/п» со знаком минус — вместе с авансами мастерам по банку; в итоги поступлений и сверку с ДП они не входят.',
] as const;

const CREATE_ITEMS = [
  '«+ Выплата»: получатель, сумма, дата и способ обязательны; для наличных обязателен менеджер кассы (по умолчанию — текущий пользователь).',
  'Категория — З/п, Аванс, Премия или Прочее — только пометка в журнале, на кассу и банк не влияет.',
  'Наличная выплата сразу уменьшает кассу выбранного менеджера; безналичная — только отражается в «Банке».',
] as const;

const EDIT_ITEMS = [
  'Редактировать и удалять можно только записи раздела — супер-админ, кнопки в конце строки.',
  'Записи ДП правятся и удаляются в журнале ДП по его правилам (правка — супер-админ, свои записи текущего месяца — сам сотрудник).',
  'Удаление мягкое: выплата исчезает из этого журнала, кассы и раздела «Банк», но строка остаётся в журнале ДП (если выплата пришла оттуда).',
] as const;

const TOTALS_ITEMS = [
  '«Выплачено за период» — сумма всех выплат журнала за период, строкой ниже — разбивка на наличные и банк.',
  'Плитки показывают суммы по получателям за период; у каждой — доля от итога.',
  'Фильтры: период (сегодня/неделя/месяц и даты), способ (Наличные/Банк), поиск по получателю и примечанию.',
] as const;

export function PayoutsRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Записи журнала</p>
            <ul className={styles.list}>
              {ENTRY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Получатель</p>
            <ul className={styles.list}>
              {RECIPIENT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Наличные и банк</p>
            <ul className={styles.list}>
              {METHOD_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Выплата</p>
            <ul className={styles.list}>
              {CREATE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Правка и удаление</p>
            <ul className={styles.list}>
              {EDIT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Итоги и фильтры</p>
            <ul className={styles.list}>
              {TOTALS_ITEMS.map((item) => (
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
