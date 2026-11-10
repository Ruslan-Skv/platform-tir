'use client';

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Портал для вложенных модалок внутри «Настроек договоров»: панель Modal
 * использует CSS transform, поэтому position:fixed-оверлеи вложенных модалок
 * без портала к viewport позиционировались бы относительно панели.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
