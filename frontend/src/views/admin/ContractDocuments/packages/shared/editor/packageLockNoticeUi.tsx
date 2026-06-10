'use client';

import type { ReactNode } from 'react';

import cdWindows from '../../../styles/windows-package.module.css';

/** Единый класс баннера «документ заблокирован» (как на вкладках Ремонта). */
export const PACKAGE_LOCK_NOTICE_CLASS = cdWindows.packageLockNotice;

export type PackageLockNoticeScope = 'contract' | 'estimate' | 'specification' | 'addendum';

export function packageLockNoticeMessage(
  scope: PackageLockNoticeScope,
  options?: { slotOrdinal?: number; productDirection?: boolean }
): string {
  switch (scope) {
    case 'contract':
      return 'Договор подписан: текст договора на этой вкладке только для просмотра и печати.';
    case 'estimate':
      return options?.productDirection
        ? 'Договор подписан: счёт-заказ и прикреплённые расчёты только для просмотра и печати.'
        : 'Договор подписан: смета договора и прикреплённые к ней расчёты только для просмотра и печати. Дополнительные объёмы оформляйте на вкладках «Д/с №1»…«Д/с №5»: там можно прикрепить новые расчёты к соответствующему дополнительному соглашению.';
    case 'specification':
      return 'Договор подписан: спецификация только для просмотра и печати.';
    case 'addendum': {
      const slotOrdinal = options?.slotOrdinal ?? 1;
      return options?.productDirection
        ? `Д/с №${slotOrdinal} подписано: счёт-заказ, спецификация и документ на этой вкладке только для просмотра и печати.`
        : `Д/с №${slotOrdinal} подписано: расчёты и документ на этой вкладке только для просмотра и печати.`;
    }
  }
}

export function PackageLockNotice({
  children,
  className = PACKAGE_LOCK_NOTICE_CLASS,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={className}>{children}</p>;
}
