'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import dpTipStyles from '@/views/admin/CRM/MoneyMovements/DpRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с разделом «Поставщики»',
  note: 'Полномочный аналог таблицы на Google-Диске: итоговая вкладка с сальдо по каждому поставщику для руководителя + карточка поставщика с банковскими реквизитами и ведомостью счетов/оплат. Ответственные за поставщика вносят счета и оплаты в его ведомость, сальдо пересчитывается само.',
} as const;

const SUMMARY_ITEMS = [
  'Сводный список — как вкладка «Итого»: по каждому поставщику «К оплате» (сальдо конечное) и общий итог по плиткам сверху.',
  'Сальдо конечное = сальдо начальное + Σ счетов − Σ оплат. Положительное — должны поставщику, ноль — расчёты завершены, отрицательное — переплата (синим).',
  'Сортировка по колонкам «Поставщик», «К оплате» и «Последняя запись»; фильтры-чипы: «К оплате», «Без задолженности», «Переплата». Поиск — по названию и ИНН.',
] as const;

const CARD_ITEMS = [
  'Клик по строке — карточка поставщика: баланс (сальдо начальное + начислено − оплачено = к оплате), ведомость и банковские реквизиты.',
  '«+ Запись» в ведомости — счёт (сумма увеличивает долг) и/или оплата (уменьшает). № документа — свободной строкой, как в таблице («№ 71 от 14 октября 2026 г.»), в примечании — № договора.',
  'Статус строки считается сам: «Оплачен» (оплата ≥ суммы), «Частично», «Не оплачен». Отдельная оплата без счёта — «Оплата» (аванс/переплата).',
  'Блоков реквизитов может быть несколько — разные юрлица и счета одного поставщика (например, «ИП Ермаков» и «Максидорс»). Поля можно копировать одним кликом для платежки.',
  'Сальдо начальное задаётся на карточке поставщика (кнопка «Реквизиты и карточка»): обычно это текущий остаток из таблицы на момент перехода в раздел.',
] as const;

export function SuppliersRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={dpTipStyles.helpPanel}
      body={
        <div className={dpTipStyles.body}>
          <p className={dpTipStyles.note}>{HELP.note}</p>

          <section className={dpTipStyles.section}>
            <h4 className={dpTipStyles.sectionTitle}>Сводный список</h4>
            <ul className={dpTipStyles.list}>
              {SUMMARY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={dpTipStyles.section}>
            <h4 className={dpTipStyles.sectionTitle}>Карточка поставщика</h4>
            <ul className={dpTipStyles.list}>
              {CARD_ITEMS.map((item) => (
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
