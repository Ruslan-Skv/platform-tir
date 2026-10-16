'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import dpTipStyles from '@/views/admin/CRM/MoneyMovements/DpRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с банком',
  note: 'Журнал поступлений на расчётные счета компании по банковской выписке, плюс строки безналичных выплат з/п — для полной картины движения денег. Над таблицей — итоги за период по банкам, ниже — фильтры.',
} as const;

const ENTRY_ITEMS = [
  '«+ Поступление» — ручной ввод записи по выписке: зачисление на счёт, комиссия банка и возврат, если был. «Итого» строки = зачисление + комиссия + возврат (валовая сумма).',
  '«Терминал + QR + банк прил.» объединяет эквайринг, СБП и QR-оплаты: из выписки не всегда видно, как именно платил клиент. Остальные способы — «По счёту» и «Перевод на ЛК».',
  '«Перевод на ЛК» вручную больше не вносится: переводы на ЛК исключены из банковской сверки; способ сохраняется только у старых записей при их правке.',
  'Строки «Выплата з/п» с отрицательной суммой — не записи банка, а проекции безналичных выплат: из раздела «Выплаты з/п», записей ДП «Зар/плата» и авансов мастерам. Правятся в своих разделах — здесь не редактируются и не удаляются.',
  'Проекции выплат показываются, только когда не выбраны фильтры по банку и способу оплаты; период и поиск на них действуют.',
] as const;

const TOTALS_ITEMS = [
  '«Итого за период» — валовая сумма поступлений по всем банкам за выбранный период, включая комиссии и возвраты.',
  'Плитки банков — разбивка поступлений по счетам (Сбер, Альфа, Другой); строка «Зачислено» на плитке — поступление за вычетом комиссии и возвратов.',
  'Плитка «Выплаты з/п» — сумма и число безналичных выплат за период; в «Итого за период» она не входит.',
  'Плитки «Комиссия банков» и «Возвраты» — эти составляющие за период отдельной строкой (в итог входят).',
] as const;

const MANUAL_ITEMS = [
  '«+ Поступление» доступно с правами на изменение раздела: дата зачисления, банк и способ обязательны.',
  'Из сумм нужна хотя бы одна — зачисление, комиссия или возврат; отрицательные суммы не допускаются. Контрагент и примечание — по желанию.',
  '«Итого» считается автоматически и показывается в модалке при вводе.',
  'Кнопка-карандаш — исправление своей записи банка; кнопка корзины (только супер-админ) удаляет запись безвозвратно, с подтверждением.',
] as const;

const FILTER_ITEMS = [
  'Фильтры: банк и способ оплаты (чипы), период («Сегодня», «Неделя», «Месяц» и даты от/до) и поиск по контрагенту и примечанию.',
  'Выбранные фильтры запоминаются между визитами; «Сбросить» возвращает текущий месяц, все банки и способы.',
  'Сопоставление поступлений с оплатами ДП — в разделе «Сверка с ДП»: там описано, что и с чем сверяется.',
] as const;

export function BankRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={dpTipStyles.helpPanel}
      body={
        <div className={dpTipStyles.body}>
          <p className={dpTipStyles.note}>{HELP.note}</p>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Записи журнала</p>
            <ul className={dpTipStyles.list}>
              {ENTRY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Итоги за период</p>
            <ul className={dpTipStyles.list}>
              {TOTALS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Поступление и правка</p>
            <ul className={dpTipStyles.list}>
              {MANUAL_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Фильтры и сверка</p>
            <ul className={dpTipStyles.list}>
              {FILTER_ITEMS.map((item) => (
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
