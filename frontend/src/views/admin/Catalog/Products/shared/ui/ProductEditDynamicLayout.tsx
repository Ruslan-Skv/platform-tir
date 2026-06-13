import type { CSSProperties, ReactNode } from 'react';

import styles from '../ProductEditPage.module.css';

type ProductEditPageRootProps = {
  stickyTopPx: number;
  children: ReactNode;
};

export function ProductEditPageRoot({ stickyTopPx, children }: ProductEditPageRootProps) {
  return (
    <div
      className={styles.page}
      style={{ '--product-edit-sticky-top': `${stickyTopPx}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}

type ProductEditSaveButtonPlaceholderProps = {
  width: number;
  height: number;
};

export function ProductEditSaveButtonPlaceholder({
  width,
  height,
}: ProductEditSaveButtonPlaceholderProps) {
  return <span className={styles.saveButtonPlaceholder} style={{ width, height }} aria-hidden />;
}
