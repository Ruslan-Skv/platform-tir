'use client';

import type { CSSProperties, ReactNode } from 'react';

type AdminStickyPageRootProps = {
  stickyTopPx: number;
  className?: string;
  children: ReactNode;
};

export function AdminStickyPageRoot({
  stickyTopPx,
  className,
  children,
}: AdminStickyPageRootProps) {
  return (
    <div
      className={className}
      style={{ '--admin-sticky-save-top': `${stickyTopPx}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}
