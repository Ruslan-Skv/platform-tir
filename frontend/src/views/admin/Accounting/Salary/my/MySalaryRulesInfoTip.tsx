'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from '../SalaryRulesInfoTip.module.css';

const HELP = {
  title: 'Как считается моя з/п',
  note: 'Личный расчёт за выбранный период: ваши роли по договорам (менеджер, замерщик, ВС, бригадир), оклад и премии. Итог — всё, что начислено вам за период.',
} as const;

const PARTS_ITEMS = [
  '«Менеджер» — з/п по договорам, где вы менеджер: стоимость × % менеджера × доля при заключении + доля при закрытии + доп. соглашения.',
  '«Замеры» — з/п за замеры по договорам, где вы замерщик.',
  '«ВС» — фонд ведущего специалиста по направлениям, закреплённым за вами в настройках.',
  '«Бригадир» — бригадирский фонд, если вы назначены бригадиром в настройках.',
  '«Оклад» — дневные доли установленного оклада за дни периода (считается по сегодняшний день); из оклада удерживаются нарушения режима, автозакрытия и прогулы, если контроль включён в настройках.',
  '«Премия за продажи» — за призовые места (1–3) по итогам продаж за полностью завершённые месяцы.',
  '«Премия за план» — за достижение порогов вашего индивидуального плана продаж: % от з/п по вашим договорам за месяц.',
  '«QR + Н» — если за месяц терминал дал менее 50% ваших продаж: установленный процент от остальных продаж.',
] as const;

const CONTRACTS_ITEMS = [
  'Договор попадает в расчёт, если в период вошла дата заключения, дата закрытия или дата доп. соглашения и у вас в нём есть роль с начислением.',
  'В таблице договоров видно, в каких ролях вы участвовали и сколько начислено по каждой роли.',
  'Учитываются договоры, привязанные к вашему пользователю; свободные имена из импортированной таблицы в личном расчёте не участвуют.',
] as const;

const PERIOD_ITEMS = [
  'Период — текущий/прошлый месяц или произвольные даты; расчёт пересчитывается при смене периода и по кнопке «Обновить».',
] as const;

/** Подсказка «Как считается моя з/п» в шапке раздела «Моя з/п». */
export function MySalaryRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Из чего складывается з/п</p>
            <ul className={styles.list}>
              {PARTS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Договоры в расчёте</p>
            <ul className={styles.list}>
              {CONTRACTS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Период</p>
            <ul className={styles.list}>
              {PERIOD_ITEMS.map((item) => (
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
