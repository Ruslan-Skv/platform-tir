import type { ReactNode } from 'react';

type CompareGridLayoutProps = {
  className?: string;
  gridTemplateColumns: string;
  children: ReactNode;
};

/** Обёртка с runtime grid-template-columns для таблицы сравнения. */
export function CompareGridLayout({
  className,
  gridTemplateColumns,
  children,
}: CompareGridLayoutProps) {
  return (
    <div className={className} style={{ gridTemplateColumns }}>
      {children}
    </div>
  );
}
