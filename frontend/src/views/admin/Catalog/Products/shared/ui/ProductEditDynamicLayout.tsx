'use client';

import type { ReactNode } from 'react';

import {
  AdminStickyPageRoot,
  AdminStickySaveButtonPlaceholder,
} from '@/views/admin/ui/AdminStickySaveButton';

import styles from '../ProductEditPage.module.css';

type ProductEditPageRootProps = {
  stickyTopPx: number;
  children: ReactNode;
};

/** @deprecated Use AdminStickyPageRoot from @/views/admin/ui/AdminStickySaveButton */
export function ProductEditPageRoot({ stickyTopPx, children }: ProductEditPageRootProps) {
  return (
    <AdminStickyPageRoot stickyTopPx={stickyTopPx} className={styles.page}>
      {children}
    </AdminStickyPageRoot>
  );
}

type ProductEditSaveButtonPlaceholderProps = {
  width: number;
  height: number;
};

/** @deprecated Use AdminStickySaveButtonPlaceholder from @/views/admin/ui/AdminStickySaveButton */
export function ProductEditSaveButtonPlaceholder({
  width,
  height,
}: ProductEditSaveButtonPlaceholderProps) {
  return <AdminStickySaveButtonPlaceholder width={width} height={height} />;
}
