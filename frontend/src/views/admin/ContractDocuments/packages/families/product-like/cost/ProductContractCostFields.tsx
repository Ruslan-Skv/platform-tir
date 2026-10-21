'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import { formatMoneyWholeGrouped } from '../../../platform/form/moneyWhole';
import type { ProductContractCostBreakdown } from './productContractCostBreakdown';

const DATA_FIELD = `${cdBase.field} ${cdDataTab.field} ${cdEstimateTab.field}`;
const DATA_AUTO_FILLED = `${cdBase.autoFilledInput} ${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;

type ProductContractCostFieldsProps = {
  breakdown: ProductContractCostBreakdown;
};

/** Сумма для поля на «Данных»: целыми рублями, разряды через пробел («1 234 567 руб.»). */
function costFieldValue(amount: number): string {
  return `${Number.isFinite(amount) && amount > 0 ? formatMoneyWholeGrouped(amount) : '0'} руб.`;
}

export function ProductContractCostFields({ breakdown }: ProductContractCostFieldsProps) {
  return (
    <div className={cdDataTab.windowsContractCostStack}>
      <div className={DATA_FIELD}>
        <label htmlFor="repair_data_windows_contract_total">Стоимость договора</label>
        <input
          id="repair_data_windows_contract_total"
          type="text"
          readOnly
          value={costFieldValue(breakdown.totalAmount)}
          placeholder="—"
          className={DATA_AUTO_FILLED}
          title="Сумма стоимости работ и стоимости изделий"
        />
      </div>
      <div className={DATA_FIELD}>
        <label htmlFor="repair_data_windows_products_cost">Стоимость изделий</label>
        <input
          id="repair_data_windows_products_cost"
          type="text"
          readOnly
          value={costFieldValue(breakdown.productsAmount)}
          placeholder="—"
          className={DATA_AUTO_FILLED}
          title="Из вкладки «Спецификация»"
        />
      </div>
      <div className={DATA_FIELD}>
        <label htmlFor="repair_data_windows_works_cost">Стоимость работ</label>
        <input
          id="repair_data_windows_works_cost"
          type="text"
          readOnly
          value={costFieldValue(breakdown.worksAmount)}
          placeholder="—"
          className={DATA_AUTO_FILLED}
          title="Из вкладки «Счёт-заказ»"
        />
      </div>
    </div>
  );
}
