import type { ReactNode } from 'react';

type IndentedBlockProps = {
  paddingLeft: number;
  className?: string;
  children: ReactNode;
};

/** Обёртка с runtime-отступом для древовидных списков. */
export function IndentedBlock({ paddingLeft, className, children }: IndentedBlockProps) {
  return (
    <div className={className} style={{ paddingLeft }}>
      {children}
    </div>
  );
}
