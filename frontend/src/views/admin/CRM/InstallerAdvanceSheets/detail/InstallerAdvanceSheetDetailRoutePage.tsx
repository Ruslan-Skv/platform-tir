'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { InstallerAdvanceSheetsPage } from '../list/InstallerAdvanceSheetsPage';
import { InstallerAdvanceSheetDetailModal } from '../shared/InstallerAdvanceSheetDetailModal';

/**
 * Роут /admin/installer-advance-sheets/[id]: под карточкой — список ведомостей,
 * сама ведомость открывается модалкой (тот же вид, что из чипов план-графика).
 */
export function InstallerAdvanceSheetDetailRoutePage({ sheetId }: { sheetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  /**
   * Закрываем с анимацией: даём модалке уйти (~0.24с, переход закрытия 0.2с),
   * затем уходим к списку — иначе роут сменил бы страницу мгновенно.
   */
  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => router.push('/admin/installer-advance-sheets'), 240);
  }, [router]);

  return (
    <>
      <InstallerAdvanceSheetsPage />
      <InstallerAdvanceSheetDetailModal isOpen={open} sheetId={sheetId} onClose={close} />
    </>
  );
}
