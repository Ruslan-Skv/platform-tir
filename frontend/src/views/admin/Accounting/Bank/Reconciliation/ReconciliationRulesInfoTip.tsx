'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import dpTipStyles from '@/views/admin/CRM/MoneyMovements/DpRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать со сверкой',
  note: 'Сверка реальных поступлений на расчётные счета (раздел «Банк») с оплатами из журнала ДП за выбранный период. Цель — найти непоступившие суммы и другие расхождения.',
} as const;

const SCOPE_ITEMS = [
  'Сверяются безналичные оплаты ДП — терминал, QR, «По счёту», «Перевод на ЛК»; автоматические и ручные записи одинаково.',
  'Наличные не сверяются независимо от вида записи (в т.ч. наличные ручные проводки) — наличные сдаются инкассацией.',
  'Способы сопоставляются так: терминал и QR ДП ↔ «Терминал + QR» банка, «По счёту» ↔ «По счёту», «Перевод на ЛК» ↔ «Перевод на ЛК».',
  'Сверка идёт по валовой сумме: у оплаты ДП — вся сумма, у поступления — «Итого» (зачисление + комиссия + возврат).',
] as const;

const LAG_ITEMS = [
  'Деньги обычно приходят на счёт в течение 0–3 дней после оплаты — лаг настраивается чипами (по умолчанию 3 дня).',
  'Автоматика ищет оплаты в окне от «дата зачисления − лаг» до даты зачисления.',
  'Оплата в конце периода, чей лаг ещё не истёк, помечается «В пути» и расхождением не считается.',
  'Если менеджер внёс оплату позже (дата оплаты больше даты зачисления), автоматика её не предложит — привяжите вручную кнопкой «К поступлению».',
] as const;

const MATCH_ITEMS = [
  'Уровень 1: одна оплата точно равна поступлению.',
  'Уровень 2: все оплаты одного дня тем же способом — терминал и QR часто суммируются и приходят одной суммой.',
  'Уровень 3: все оплаты за окно зачисления в сумме дают поступление.',
  'Найденное показывается синим статусом «Предложение …» — проверьте состав и зафиксируйте.',
] as const;

const FIX_ITEMS = [
  '«Зафиксировать сверку» создаёт связь оплаты с поступлением; зафиксированные суммы в дальнейших сверках не участвуют.',
  'Оплата может прийти частями (двумя переводами) — привяжите её к двум поступлениям: суммы связей распределятся по остаткам автоматически.',
  'Статусы поступлений: «Сверено» — покрыто полностью, «Частично» — есть несвёренный остаток, «Без оплат» — подходящих оплат не нашлось.',
  'Блок «Оплаты ДП без поступления» — суммы без найденных поступлений (кроме «В пути»).',
  'Снять фиксацию может только супер-админ: кнопка × у конкретной связи или «Снять всю фиксацию» у поступления.',
] as const;

export function ReconciliationRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={dpTipStyles.helpPanel}
      body={
        <div className={dpTipStyles.body}>
          <p className={dpTipStyles.note}>{HELP.note}</p>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Что сверяется</p>
            <ul className={dpTipStyles.list}>
              {SCOPE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Лаг зачисления</p>
            <ul className={dpTipStyles.list}>
              {LAG_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Автоподбор сопоставлений</p>
            <ul className={dpTipStyles.list}>
              {MATCH_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Фиксация и расхождения</p>
            <ul className={dpTipStyles.list}>
              {FIX_ITEMS.map((item) => (
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
