'use client';

import styles from '../ContractDocuments.module.css';
import type { WindowsContractCostBreakdown } from './windowsContractCostBreakdown';

type WindowsContractCostFieldsProps = {
  breakdown: WindowsContractCostBreakdown;
};

export function WindowsContractCostFields({ breakdown }: WindowsContractCostFieldsProps) {
  return (
    <div className={styles.windowsContractCostStack}>
      <div className={styles.field}>
        <label htmlFor="repair_data_windows_contract_total">Стоимость договора</label>
        <input
          id="repair_data_windows_contract_total"
          type="text"
          readOnly
          value={breakdown.totalDisplay}
          placeholder="—"
          className={styles.autoFilledInput}
          title="Сумма стоимости работ и стоимости изделий"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="repair_data_windows_products_cost">Стоимость изделий</label>
        <input
          id="repair_data_windows_products_cost"
          type="text"
          readOnly
          value={breakdown.productsDisplay}
          placeholder="—"
          className={styles.autoFilledInput}
          title="Из вкладки «Спецификация»"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="repair_data_windows_works_cost">Стоимость работ</label>
        <input
          id="repair_data_windows_works_cost"
          type="text"
          readOnly
          value={breakdown.worksDisplay}
          placeholder="—"
          className={styles.autoFilledInput}
          title="Из вкладки «Счёт-заказ»"
        />
      </div>
    </div>
  );
}
