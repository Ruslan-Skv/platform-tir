'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import dpTipStyles from '@/views/admin/CRM/MoneyMovements/DpRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с расчётом мастеров',
  note: 'Журнал выплат мастерам: кто, по какому договору и сколько получил за период. Ниже — сводка по мастерам: начислено по заказ-нарядам, выплачено и остаток. Выдачу фиксирует супер-админ кнопкой «+ Выплата» или в модалке «Заказ-наряды» договора.',
} as const;

const ENTRY_ITEMS = [
  'Строка журнала — выдача денег мастеру: дата, мастер с разрядом, направление, договор с его стадией, заказчик с адресом объекта, комментарий, кто выдал, сумма и способ оплаты («Наличные» или «Банк»; «—» — старые записи до появления способа).',
  'Проводки создаются в двух местах и попадают в один журнал: кнопка «+ Выплата» здесь и модалка «Заказ-наряды» договора (вкладка «Интерактивная итоговая смета»).',
  'Правка и удаление выплат — в модалке «Заказ-наряды» договора; в этом разделе журнал только читается.',
  'Наличные выплаты попадают в раздел «Касса (центр)» (основание «Зар/плата», со знаком минус), банковские — строками «Выплата з/п» в разделе «Банк».',
] as const;

const MASTERS_ITEMS = [
  '«Начислено» — итог заказ-нарядов мастера по договорам выбранных направлений (под суммой — число позиций); «Договоров» — количество его договоров.',
  '«Выплачено всего» — все выдачи мастера за всё время (под суммой — число выплат); «Выдано за период» — выдачи по датам фильтра.',
  '«Остаток к выплате» = начислено − выплачено всего; от периода не зависит. Отрицательный остаток показывается красным как «Переплата».',
  '«—» в начислениях и остатке — у мастера нет назначений в заказ-нарядах, его начисления неизвестны; в строке «Итого» тогда пометка «не по всем».',
] as const;

const ADVANCE_ITEMS = [
  '«+ Выплата» видна только супер-админу — роль проверяется и на сервере.',
  'Заказ выбирается панелью поиска, номер договора подставляется сам; мастер — только из выбранного заказа (привязанные к договору и уже получавшие по нему авансы).',
  'Обязательны: заказ, мастер, дата выдачи и сумма (положительное число); способ оплаты — «Наличные» или «Банк», комментарий — по желанию.',
  'Запись сразу попадает в журнал раздела и в «Заказ-наряды» договора — остаток мастера пересчитается.',
] as const;

const FILTER_ITEMS = [
  'Над таблицей — «Выдано за период» и плитки выплат по направлениям (Ремонт, Окна, Двери, Потолки, Жалюзи, Мебель — только ненулевые).',
  'Фильтры: направление (чипы), период («Сегодня», «Неделя», «Месяц» и даты от/до), мастер и поиск по № договора, заказчику, мастеру и комментарию.',
  'Выбранные фильтры запоминаются между визитами; «Сбросить» возвращает текущий месяц, все направления и мастеров.',
] as const;

export function InstallerSettlementsRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={dpTipStyles.helpPanel}
      body={
        <div className={dpTipStyles.body}>
          <p className={dpTipStyles.note}>{HELP.note}</p>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Журнал выплат</p>
            <ul className={dpTipStyles.list}>
              {ENTRY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Сводка по мастерам</p>
            <ul className={dpTipStyles.list}>
              {MASTERS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Выдача аванса</p>
            <ul className={dpTipStyles.list}>
              {ADVANCE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <p className={dpTipStyles.sectionTitle}>Итоги и фильтры</p>
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
