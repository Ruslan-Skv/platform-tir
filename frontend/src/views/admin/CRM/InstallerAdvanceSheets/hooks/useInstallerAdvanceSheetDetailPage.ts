'use client';

import { useCallback, useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import {
  type InstallerAdvanceSheetDetail,
  type InstallerAdvanceSheetItemParams,
  addInstallerAdvanceSheetItemComment,
  deleteInstallerAdvanceSheet,
  getInstallerAdvanceSheet,
  payAllInstallerAdvanceSheetItems,
  payInstallerAdvanceSheetItem,
  resolveInstallerAdvanceSheetItemQuestion,
  unpayInstallerAdvanceSheetItem,
  updateInstallerAdvanceSheet,
} from '@/shared/api/crm/admin-installer-advance-sheets';
import { INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS } from '@/shared/constants/installerAdvancePaymentMethod';

import { isIasSheetAuthor, todayIsoDate } from '../shared/installer-advance-sheets-page.constants';

/** Цель модалки выплаты: строка ведомости или вся ведомость целиком. */
type PayTarget = { kind: 'item'; itemId: string } | { kind: 'all' } | null;

/**
 * Карточка ведомости. По умолчанию — страница /admin/installer-advance-sheets/[id];
 * через options работает в модалке над любой страницей (напр., чипы план-графика).
 */
export function useInstallerAdvanceSheetDetailPage(options?: {
  /** id ведомости из вызова (модалка); по умолчанию — параметр маршрута [id]. */
  sheetId?: string;
  /** Вместо перехода к списку после удаления ведомости (модалка закрывается сама). */
  onDeleted?: () => void;
  /** false — модалка закрыта: не грузим и не обновляем данные (модалка смонтирована ради анимации). */
  active?: boolean;
}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const routeSheetId = typeof params?.id === 'string' ? params.id : '';
  const sheetId = options?.sheetId !== undefined ? options.sheetId : routeSheetId;
  const active = options?.active ?? true;
  const { user } = useAuth();

  const canManagePayments = user?.role === 'SUPER_ADMIN';
  const canEditSheets = isIasSheetAuthor(user?.role);
  /** Комментировать могут авторы ведомости (ВС/бригадир) и супер-админ. */
  const canComment = canEditSheets || canManagePayments;

  const [sheet, setSheet] = useState<InstallerAdvanceSheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Раскрытая переписка (id строки). */
  const [openCommentsItemId, setOpenCommentsItemId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyItemId, setCommentBusyItemId] = useState<string | null>(null);

  const [payTarget, setPayTarget] = useState<PayTarget>(null);
  const [payAt, setPayAt] = useState(todayIsoDate());
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [unpayTarget, setUnpayTarget] = useState<string | null>(null);
  const [unpaySubmitting, setUnpaySubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  /** Справочник мастеров — для селекта в режиме правки. */
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);

  useEffect(() => {
    let cancelled = false;
    getInstallers()
      .then((registry) => {
        if (!cancelled) setInstallers(registry);
      })
      .catch(() => {
        // селект останется без списка — правка мастера недоступна, не критично
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Смена ведомости (одна модалка переиспользуется) — сбрасываем локальный UI-стейт. */
  useEffect(() => {
    setEditMode(false);
    setOpenCommentsItemId(null);
    setPayTarget(null);
    setUnpayTarget(null);
    setDeleteOpen(false);
  }, [sheetId]);

  const refresh = useCallback(async () => {
    if (!sheetId || !active) return;
    setLoading(true);
    try {
      const detail = await getInstallerAdvanceSheet(sheetId);
      setSheet(detail);
    } catch (error) {
      setSheet(null);
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить ведомость');
    } finally {
      setLoading(false);
    }
  }, [sheetId, active]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (action: () => Promise<InstallerAdvanceSheetDetail>, successNotice?: string) => {
      try {
        const detail = await action();
        setSheet(detail);
        if (successNotice) {
          setNotice(successNotice);
          window.setTimeout(() => setNotice(null), 4000);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие');
      }
    },
    []
  );

  const openPayModal = useCallback((target: Exclude<PayTarget, null>) => {
    setPayAt(todayIsoDate());
    setPayMethod('CASH');
    setPayTarget(target);
  }, []);

  const submitPay = useCallback(async () => {
    if (!sheet || !payTarget) return;
    setPaySubmitting(true);
    try {
      await runAction(
        () =>
          payTarget.kind === 'all'
            ? payAllInstallerAdvanceSheetItems(sheet.id, {
                paidAt: payAt,
                paymentMethod: payMethod,
              })
            : payInstallerAdvanceSheetItem(sheet.id, payTarget.itemId, {
                paidAt: payAt,
                paymentMethod: payMethod,
              }),
        payTarget.kind === 'all'
          ? 'Ведомость отмечена выплаченной — авансы попали в журнал авансов'
          : 'Аванс отмечен выплаченным'
      );
      setPayTarget(null);
    } finally {
      setPaySubmitting(false);
    }
  }, [sheet, payTarget, payAt, payMethod, runAction]);

  const submitUnpay = useCallback(async () => {
    if (!sheet || !unpayTarget) return;
    setUnpaySubmitting(true);
    try {
      await runAction(
        () => unpayInstallerAdvanceSheetItem(sheet.id, unpayTarget),
        'Выплата отменена — запись удалена из журнала авансов'
      );
      setUnpayTarget(null);
    } finally {
      setUnpaySubmitting(false);
    }
  }, [sheet, unpayTarget, runAction]);

  const submitDelete = useCallback(async () => {
    if (!sheet) return;
    setDeleteSubmitting(true);
    try {
      await deleteInstallerAdvanceSheet(sheet.id);
      if (options?.onDeleted) {
        options.onDeleted();
      } else {
        router.push('/admin/installer-advance-sheets');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить ведомость');
    } finally {
      setDeleteSubmitting(false);
    }
  }, [sheet, router, options]);

  const submitEdit = useCallback(
    async (values: {
      installerId: string;
      note?: string;
      items: InstallerAdvanceSheetItemParams[];
    }) => {
      if (!sheet) return;
      setSaving(true);
      try {
        const detail = await updateInstallerAdvanceSheet(sheet.id, values);
        setSheet(detail);
        setEditMode(false);
        setNotice('Ведомость сохранена');
        window.setTimeout(() => setNotice(null), 4000);
      } finally {
        setSaving(false);
      }
    },
    [sheet]
  );

  const submitComment = useCallback(
    async (itemId: string) => {
      if (!sheet) return;
      const body = (commentDrafts[itemId] ?? '').trim();
      if (!body) return;
      setCommentBusyItemId(itemId);
      try {
        await runAction(() => addInstallerAdvanceSheetItemComment(sheet.id, itemId, body));
        setCommentDrafts((current) => ({ ...current, [itemId]: '' }));
      } finally {
        setCommentBusyItemId(null);
      }
    },
    [sheet, commentDrafts, runAction]
  );

  const resolveQuestion = useCallback(
    async (itemId: string) => {
      if (!sheet) return;
      await runAction(
        () => resolveInstallerAdvanceSheetItemQuestion(sheet.id, itemId),
        'Вопрос снят'
      );
    },
    [sheet, runAction]
  );

  const toggleComments = useCallback((itemId: string) => {
    setOpenCommentsItemId((current) => (current === itemId ? null : itemId));
  }, []);

  const setCommentDraft = useCallback((itemId: string, value: string) => {
    setCommentDrafts((current) => ({ ...current, [itemId]: value }));
  }, []);

  return {
    sheetId,
    sheet,
    loading,
    message,
    setMessage,
    notice,
    canManagePayments,
    canEditSheets,
    canComment,
    refresh,
    /** Редактирование (ВС/бригадир): невыплаченные строки. */
    editMode,
    setEditMode,
    saving,
    submitEdit,
    /** Справочник мастеров для режима правки. */
    installers,
    /** Выплата (супер-админ): построчно или всей ведомостью. */
    payTarget,
    payAt,
    setPayAt,
    payMethod,
    setPayMethod,
    payMethodLabels: INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS,
    paySubmitting,
    openPayModal,
    closePayModal: () => {
      if (!paySubmitting) setPayTarget(null);
    },
    submitPay,
    /** Отмена выплаты (супер-админ). */
    unpayTarget,
    setUnpayTarget,
    unpaySubmitting,
    submitUnpay,
    /** Удаление ведомости (ВС/бригадир, без выданных строк). */
    deleteOpen,
    setDeleteOpen,
    deleteSubmitting,
    submitDelete,
    /** Мини-переписка по строкам. */
    openCommentsItemId,
    toggleComments,
    commentDrafts,
    setCommentDraft,
    commentBusyItemId,
    submitComment,
    resolveQuestion,
  };
}

export type InstallerAdvanceSheetDetailPageModel = ReturnType<
  typeof useInstallerAdvanceSheetDetailPage
>;
