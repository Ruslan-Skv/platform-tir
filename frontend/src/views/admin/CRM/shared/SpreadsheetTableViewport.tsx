import type { ReactNode } from 'react';

type SpreadsheetTableViewportProps = {
  maxHeight: number;
  totalWidth: number;
  wrapClassName: string;
  containerClassName: string;
  children: ReactNode;
};

/** Обёртка resizable-таблицы с runtime-размерами (вне PageView). */
export function SpreadsheetTableViewport({
  maxHeight,
  totalWidth,
  wrapClassName,
  containerClassName,
  children,
}: SpreadsheetTableViewportProps) {
  return (
    <div
      className={wrapClassName}
      style={{
        maxHeight,
        ['--spreadsheet-total-width' as string]: `${totalWidth}px`,
      }}
    >
      <div className={containerClassName}>{children}</div>
    </div>
  );
}
