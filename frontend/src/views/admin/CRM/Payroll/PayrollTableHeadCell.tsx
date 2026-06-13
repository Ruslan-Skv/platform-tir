import type { ReactNode } from 'react';

type PayrollTableHeadCellProps = {
  minWidth: string | number;
  children: ReactNode;
};

/** Ячейка заголовка таблицы зарплат с runtime min-width. */
export function PayrollTableHeadCell({ minWidth, children }: PayrollTableHeadCellProps) {
  return <th style={{ minWidth }}>{children}</th>;
}
