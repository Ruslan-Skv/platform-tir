'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { type Contract, type CrmUser, getContracts, getCrmUsers } from '@/shared/api/admin-crm';
import {
  type WaybillTask,
  type WaybillTaskInput,
  completeWaybillTask,
  createWaybillTask,
  deleteWaybillTask,
  failWaybillTask,
  getWaybillTasks,
  getWaybillTrashCount,
  listDriverDeliveryAvailability,
  reopenWaybillTask,
  rescheduleWaybillTask,
  updateWaybillTask,
} from '@/shared/api/admin-waybills';

import { getBlockedDeliveryDayMessage } from '../../shared/driver-availability.utils';
import type {
  WaybillFormValues,
  WaybillStatusFilter,
  WaybillsPageMessage,
  WaybillsViewMode,
} from '../../shared/waybills-page.types';
import {
  emptyWaybillForm,
  monthEndIso,
  monthStartIso,
  parseIsoDateParts,
  parseOptionalNumber,
  readWaybillsViewMode,
  resolveWaybillCustomerFields,
  todayIsoDate,
  weekAheadIsoDate,
  writeWaybillsViewMode,
} from '../../shared/waybills-page.utils';

function addDaysIso(iso: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function useWaybillsPage() {
  const { user } = useAuth();
  const initialToday = todayIsoDate();
  const initialParts = parseIsoDateParts(initialToday);
  const initialYear = initialParts?.y ?? new Date().getFullYear();
  const initialMonthIndex0 = initialParts ? initialParts.m - 1 : new Date().getMonth();
  const initialViewMode = readWaybillsViewMode();

  const [viewMode, setViewModeState] = useState<WaybillsViewMode>(initialViewMode);
  const [calendarYear, setCalendarYear] = useState(initialYear);
  const [calendarMonthIndex0, setCalendarMonthIndex0] = useState(initialMonthIndex0);
  const [dateFrom, setDateFrom] = useState(() =>
    initialViewMode === 'calendar' ? monthStartIso(initialYear, initialMonthIndex0) : initialToday
  );
  const [dateTo, setDateTo] = useState(() =>
    initialViewMode === 'calendar'
      ? monthEndIso(initialYear, initialMonthIndex0)
      : weekAheadIsoDate(initialToday)
  );
  const [tasks, setTasks] = useState<WaybillTask[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<WaybillStatusFilter>('ALL');
  const [message, setMessage] = useState<WaybillsPageMessage | null>(null);
  const [headerSuccessText, setHeaderSuccessText] = useState('Задание добавлено');
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashMessage = useCallback((next: WaybillsPageMessage) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
    if (next.type === 'success') {
      setHeaderSuccessText(next.text);
    }
    setMessage(next);
    messageTimeoutRef.current = setTimeout(
      () => {
        setMessage(null);
        messageTimeoutRef.current = null;
      },
      next.type === 'success' ? 2000 : 4000
    );
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, []);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WaybillTask | null>(null);
  const [deleteItem, setDeleteItem] = useState<WaybillTask | null>(null);
  const [failItem, setFailItem] = useState<WaybillTask | null>(null);
  const [failNote, setFailNote] = useState('');
  const [completeItem, setCompleteItem] = useState<WaybillTask | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [rescheduleItem, setRescheduleItem] = useState<WaybillTask | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeFrom, setRescheduleTimeFrom] = useState('');
  const [rescheduleTimeTo, setRescheduleTimeTo] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const [formValues, setFormValues] = useState<WaybillFormValues>(() =>
    emptyWaybillForm(todayIsoDate())
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contractHits, setContractHits] = useState<Contract[]>([]);
  const [contractSearching, setContractSearching] = useState(false);
  const quietLoadRef = useRef(false);

  const loadTasks = useCallback(async () => {
    const quiet = quietLoadRef.current;
    quietLoadRef.current = false;
    if (!quiet) setLoading(true);
    try {
      const data = await getWaybillTasks({ dateFrom, dateTo });
      setTasks(data);
    } catch (err) {
      setTasks([]);
      flashMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить путевой лист',
      });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [dateFrom, dateTo, flashMessage]);

  const refreshTrashCount = useCallback(async () => {
    try {
      setTrashCount(await getWaybillTrashCount());
    } catch {
      setTrashCount(0);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount]);

  useEffect(() => {
    void getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const drivers = useMemo(
    () => users.filter((u) => u.role === 'DRIVER' || u.role === 'ADMIN' || u.role === 'MANAGER'),
    [users]
  );

  const defaultTaskDate = dateFrom || todayIsoDate();

  const applyCalendarMonth = useCallback((year: number, monthIndex0: number, quiet = false) => {
    if (quiet) quietLoadRef.current = true;
    setCalendarYear(year);
    setCalendarMonthIndex0(monthIndex0);
    setDateFrom(monthStartIso(year, monthIndex0));
    setDateTo(monthEndIso(year, monthIndex0));
  }, []);

  const setViewMode = useCallback(
    (mode: WaybillsViewMode) => {
      setViewModeState(mode);
      writeWaybillsViewMode(mode);
      if (mode === 'calendar') {
        const parts = parseIsoDateParts(dateFrom) ?? parseIsoDateParts(todayIsoDate());
        const year = parts?.y ?? new Date().getFullYear();
        const monthIndex0 = parts ? parts.m - 1 : new Date().getMonth();
        const nextFrom = monthStartIso(year, monthIndex0);
        const nextTo = monthEndIso(year, monthIndex0);
        if (nextFrom !== dateFrom || nextTo !== dateTo) {
          applyCalendarMonth(year, monthIndex0, true);
        } else {
          setCalendarYear(year);
          setCalendarMonthIndex0(monthIndex0);
        }
      }
      // При возврате к таблице период не сбрасываем — без лишнего refetch и дёрганья.
    },
    [applyCalendarMonth, dateFrom, dateTo]
  );

  const resetForm = useCallback(() => {
    setFormValues(emptyWaybillForm(defaultTaskDate, user?.id ?? ''));
    setFormError(null);
    setSubmitting(false);
    setContractHits([]);
  }, [defaultTaskDate, user?.id]);

  const openCreateModal = useCallback(() => {
    resetForm();
    setCreateModalOpen(true);
  }, [resetForm]);

  const openCreateModalForDate = useCallback(
    (isoDate: string) => {
      setFormValues(emptyWaybillForm(isoDate, user?.id ?? ''));
      setFormError(null);
      setSubmitting(false);
      setContractHits([]);
      setCreateModalOpen(true);
    },
    [user?.id]
  );

  const openEditModal = useCallback((item: WaybillTask) => {
    const customer = resolveWaybillCustomerFields(item);
    setFormValues({
      date: item.date.slice(0, 10),
      timeFrom: item.timeFrom ?? '',
      timeTo: item.timeTo ?? '',
      direction: item.direction ?? '',
      taskText: item.taskText,
      customerName: customer.customerName,
      customerAddress: customer.customerAddress,
      customerPhones: customer.customerPhones.length > 0 ? customer.customerPhones : [''],
      contractId: item.contractId ?? '',
      contractSearch: item.contract?.contractNumber ?? '',
      deliveryCost: item.deliveryCost != null ? String(item.deliveryCost) : '',
      deliveryPayer: item.deliveryPayer ?? '',
      moversCost: item.moversCost != null ? String(item.moversCost) : '',
      moversPayer: item.moversPayer ?? '',
      responsibleUserId: item.responsibleUserId ?? '',
      driverUserId: item.driverUserId ?? '',
    });
    setFormError(null);
    setSubmitting(false);
    setContractHits([]);
    setEditItem(item);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    resetForm();
  }, [resetForm]);

  const closeEditModal = useCallback(() => {
    setEditItem(null);
    resetForm();
  }, [resetForm]);

  const toInput = useCallback((values: WaybillFormValues): WaybillTaskInput => {
    const phones = values.customerPhones.map((p) => p.trim()).filter(Boolean);
    return {
      date: values.date,
      timeFrom: values.timeFrom.trim() || null,
      timeTo: values.timeTo.trim() || null,
      direction: values.direction.trim() || null,
      taskText: values.taskText.trim(),
      customerName: values.customerName.trim() || null,
      customerAddress: values.customerAddress.trim() || null,
      customerPhone: phones[0] ?? null,
      customerPhones: phones,
      contractId: values.contractId.trim() || null,
      deliveryCost: parseOptionalNumber(values.deliveryCost),
      deliveryPayer: values.deliveryPayer.trim() || null,
      moversCost: parseOptionalNumber(values.moversCost),
      moversPayer: values.moversPayer.trim() || null,
      responsibleUserId: values.responsibleUserId.trim() || null,
      driverUserId: values.driverUserId.trim() || null,
    };
  }, []);

  const searchContracts = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setContractHits([]);
      return;
    }
    setContractSearching(true);
    try {
      const res = await getContracts({ search: q, limit: 8 });
      setContractHits(res.data);
    } catch {
      setContractHits([]);
    } finally {
      setContractSearching(false);
    }
  }, []);

  const applyContract = useCallback((contract: Contract) => {
    const phone = contract.customerPhone?.trim() || '';
    setFormValues((prev) => ({
      ...prev,
      contractId: contract.id,
      contractSearch: contract.contractNumber,
      customerName: contract.customerName?.trim() || '',
      customerAddress: contract.customerAddress?.trim() || '',
      customerPhones: phone ? [phone] : [''],
    }));
    setContractHits([]);
  }, []);

  const assertDriverDateAllowed = useCallback(async (values: WaybillFormValues) => {
    if (!values.driverUserId.trim() || !values.date.trim()) return null;
    try {
      const items = await listDriverDeliveryAvailability();
      const scheme = items.find((i) => i.user.id === values.driverUserId)?.scheme ?? null;
      return getBlockedDeliveryDayMessage({ scheme, date: values.date });
    } catch {
      return null;
    }
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValues.taskText.trim()) {
        setFormError('Укажите задание водителю');
        return;
      }
      const blocked = await assertDriverDateAllowed(formValues);
      if (blocked) {
        setFormError(blocked);
        return;
      }
      setSubmitting(true);
      setFormError(null);
      try {
        await createWaybillTask(toInput(formValues));
        flashMessage({ type: 'success', text: 'Задание добавлено' });
        closeCreateModal();
        await loadTasks();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSubmitting(false);
      }
    },
    [assertDriverDateAllowed, closeCreateModal, flashMessage, formValues, loadTasks, toInput]
  );

  const handleEdit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editItem) return;
      if (!formValues.taskText.trim()) {
        setFormError('Укажите задание водителю');
        return;
      }
      const blocked = await assertDriverDateAllowed(formValues);
      if (blocked) {
        setFormError(blocked);
        return;
      }
      setSubmitting(true);
      setFormError(null);
      try {
        await updateWaybillTask(editItem.id, toInput(formValues));
        flashMessage({ type: 'success', text: 'Задание обновлено' });
        closeEditModal();
        await loadTasks();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSubmitting(false);
      }
    },
    [
      assertDriverDateAllowed,
      closeEditModal,
      editItem,
      flashMessage,
      formValues,
      loadTasks,
      toInput,
    ]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      await deleteWaybillTask(deleteItem.id);
      flashMessage({ type: 'success', text: 'Задание перемещено в корзину' });
      setDeleteItem(null);
      await loadTasks();
      await refreshTrashCount();
    } catch (err) {
      flashMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось удалить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [deleteItem, flashMessage, loadTasks, refreshTrashCount]);

  const openCompleteModal = useCallback((item: WaybillTask) => {
    setCompleteNote('');
    setCompleteItem(item);
  }, []);

  const handleCompleteConfirm = useCallback(async () => {
    if (!completeItem) return;
    setSubmitting(true);
    try {
      await completeWaybillTask(completeItem.id, completeNote.trim() || null);
      flashMessage({ type: 'success', text: 'Отмечено как выполнено' });
      setCompleteItem(null);
      setCompleteNote('');
      await loadTasks();
    } catch (err) {
      flashMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [completeItem, completeNote, flashMessage, loadTasks]);

  const handleFailConfirm = useCallback(async () => {
    if (!failItem) return;
    if (!failNote.trim()) {
      flashMessage({ type: 'error', text: 'Укажите причину невыполнения' });
      return;
    }
    setSubmitting(true);
    try {
      await failWaybillTask(failItem.id, failNote.trim());
      flashMessage({ type: 'success', text: 'Отмечено как не выполнено' });
      setFailItem(null);
      setFailNote('');
      await loadTasks();
    } catch (err) {
      flashMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [failItem, failNote, flashMessage, loadTasks]);

  const openRescheduleModal = useCallback((item: WaybillTask) => {
    const sourceDate = item.date.slice(0, 10);
    setRescheduleItem(item);
    setRescheduleDate(addDaysIso(sourceDate, 1));
    setRescheduleTimeFrom(item.timeFrom ?? '');
    setRescheduleTimeTo(item.timeTo ?? '');
    setRescheduleError(null);
  }, []);

  const closeRescheduleModal = useCallback(() => {
    setRescheduleItem(null);
    setRescheduleError(null);
  }, []);

  const handleRescheduleConfirm = useCallback(async () => {
    if (!rescheduleItem) return;
    if (!rescheduleDate.trim()) {
      setRescheduleError('Укажите новую дату');
      return;
    }
    setSubmitting(true);
    setRescheduleError(null);
    try {
      await rescheduleWaybillTask(rescheduleItem.id, {
        date: rescheduleDate,
        timeFrom: rescheduleTimeFrom.trim() || null,
        timeTo: rescheduleTimeTo.trim() || null,
      });
      flashMessage({
        type: 'success',
        text: 'Задание скопировано на новую дату. Оригинал можно отметить «Не выполнено» вручную.',
      });
      closeRescheduleModal();
      const nextFrom = rescheduleDate < dateFrom ? rescheduleDate : dateFrom;
      const nextTo = rescheduleDate > dateTo ? rescheduleDate : dateTo;
      if (nextFrom !== dateFrom) setDateFrom(nextFrom);
      if (nextTo !== dateTo) setDateTo(nextTo);
      if (nextFrom === dateFrom && nextTo === dateTo) {
        await loadTasks();
      }
      // иначе loadTasks сработает из useEffect по смене dateFrom/dateTo
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : 'Не удалось скопировать задание');
    } finally {
      setSubmitting(false);
    }
  }, [
    closeRescheduleModal,
    dateFrom,
    dateTo,
    flashMessage,
    loadTasks,
    rescheduleDate,
    rescheduleItem,
    rescheduleTimeFrom,
    rescheduleTimeTo,
  ]);

  const handleReopen = useCallback(
    async (item: WaybillTask) => {
      try {
        await reopenWaybillTask(item.id);
        flashMessage({ type: 'success', text: 'Задание возвращено в план' });
        await loadTasks();
      } catch (err) {
        flashMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Не удалось вернуть',
        });
      }
    },
    [flashMessage, loadTasks]
  );

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    viewMode,
    setViewMode,
    calendarYear,
    calendarMonthIndex0,
    setCalendarMonth: applyCalendarMonth,
    tasks,
    filtered,
    loading,
    statusFilter,
    setStatusFilter,
    message,
    headerSuccessText,
    headerSuccessVisible: message?.type === 'success',
    users,
    drivers,
    createModalOpen,
    editItem,
    deleteItem,
    setDeleteItem,
    failItem,
    setFailItem,
    failNote,
    setFailNote,
    completeItem,
    setCompleteItem,
    completeNote,
    setCompleteNote,
    formValues,
    setFormValues,
    formError,
    submitting,
    contractHits,
    contractSearching,
    openCreateModal,
    openCreateModalForDate,
    openEditModal,
    closeCreateModal,
    closeEditModal,
    handleCreate,
    handleEdit,
    handleDelete,
    openCompleteModal,
    handleCompleteConfirm,
    handleFailConfirm,
    handleReopen,
    openRescheduleModal,
    closeRescheduleModal,
    handleRescheduleConfirm,
    rescheduleItem,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTimeFrom,
    setRescheduleTimeFrom,
    rescheduleTimeTo,
    setRescheduleTimeTo,
    rescheduleError,
    searchContracts,
    applyContract,
    refresh: loadTasks,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    currentUserId: user?.id ?? null,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    canManageWaybillSettings: Boolean(
      user?.role &&
      [
        'SUPER_ADMIN',
        'ADMIN',
        'MODERATOR',
        'SUPPORT',
        'MANAGER',
        'TECHNOLOGIST',
        'BRIGADIER',
        'LEAD_SPECIALIST_FURNITURE',
        'LEAD_SPECIALIST_WINDOWS_DOORS',
      ].includes(user.role)
    ),
  };
}

export type WaybillsPageModel = ReturnType<typeof useWaybillsPage>;
