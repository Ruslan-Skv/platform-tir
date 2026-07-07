'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import {
  type DoorsSpecificationLine,
  computeDoorsSpecificationNetTotal,
  formatDoorsSpecificationMoney,
} from './doorsSpecification';

type Props = {
  lines: DoorsSpecificationLine[];
  discountPercent: string;
};

export function DoorsSpecificationTotalsBlock({ lines, discountPercent }: Props) {
  const {
    grossTotal,
    discountPercent: parsedDiscount,
    netTotal,
  } = computeDoorsSpecificationNetTotal(lines, discountPercent);

  if (grossTotal <= 0) {
    return <p className={cdDocPreview.estimateA4Empty}>Позиции не заполнены.</p>;
  }

  if (parsedDiscount > 0) {
    return (
      <>
        <p className={cdDocPreview.estimateA4Total}>
          Итого по спецификации (без скидки):{' '}
          <strong>{formatDoorsSpecificationMoney(grossTotal)} руб.</strong>
        </p>
        <p className={cdDocPreview.estimateA4DiscountMeta}>
          Скидка по спецификации: {String(parsedDiscount).replace('.', ',')}%
        </p>
        <p className={cdDocPreview.estimateA4Total}>
          Итого со скидкой: <strong>{formatDoorsSpecificationMoney(netTotal)} руб.</strong>
        </p>
      </>
    );
  }

  return (
    <p className={cdDocPreview.estimateA4Total}>
      Итого по спецификации: <strong>{formatDoorsSpecificationMoney(grossTotal)} руб.</strong>
    </p>
  );
}
