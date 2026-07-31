'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
  reopenWaybillTask,
  updateWaybillTask,
} from '@/shared/api/admin-waybills';

import type {
  WaybillFormValues,
  WaybillStatusFilter,
  WaybillsPageMessage,
} from '../../shared/waybills-page.types';
import {
  emptyWaybillForm,
  parseOptionalNumber,
  resolveWaybillCustomerFields,
  todayIsoDate,
  weekAheadIsoDate,
} from '../../shared/waybills-page.utils';

export function useWaybillsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(todayIsoDate);
  const [dateTo, setDateTo] = useState(() => weekAheadIsoDate());
  const [tasks, setTasks] = useState<WaybillTask[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<WaybillStatusFilter>('ALL');
  const [message, setMessage] = useState<WaybillsPageMessage | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WaybillTask | null>(null);
  const [deleteItem, setDeleteItem] = useState<WaybillTask | null>(null);
  const [failItem, setFailItem] = useState<WaybillTask | null>(null);
  const [failNote, setFailNote] = useState('');
  const [completeItem, setCompleteItem] = useState<WaybillTask | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const [formValues, setFormValues] = useState<WaybillFormValues>(() =>
    emptyWaybillForm(todayIsoDate())
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contractHits, setContractHits] = useState<Contract[]>([]);
  const [contractSearching, setContractSearching] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWaybillTasks({ dateFrom, dateTo });
      setTasks(data);
    } catch (err) {
      setTasks([]);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить путевой лист',
      });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

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

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValues.taskText.trim()) {
        setFormError('Укажите задание водителю');
        return;
      }
      setSubmitting(true);
      setFormError(null);
      try {
        await createWaybillTask(toInput(formValues));
        setMessage({ type: 'success', text: 'Задание добавлено' });
        closeCreateModal();
        await loadTasks();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSubmitting(false);
      }
    },
    [closeCreateModal, formValues, loadTasks, toInput]
  );

  const handleEdit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editItem) return;
      if (!formValues.taskText.trim()) {
        setFormError('Укажите задание водителю');
        return;
      }
      setSubmitting(true);
      setFormError(null);
      try {
        await updateWaybillTask(editItem.id, toInput(formValues));
        setMessage({ type: 'success', text: 'Задание обновлено' });
        closeEditModal();
        await loadTasks();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSubmitting(false);
      }
    },
    [closeEditModal, editItem, formValues, loadTasks, toInput]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      await deleteWaybillTask(deleteItem.id);
      setMessage({ type: 'success', text: 'Задание перемещено в корзину' });
      setDeleteItem(null);
      await loadTasks();
      await refreshTrashCount();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось удалить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [deleteItem, loadTasks, refreshTrashCount]);

  const openCompleteModal = useCallback((item: WaybillTask) => {
    setCompleteNote('');
    setCompleteItem(item);
  }, []);

  const handleCompleteConfirm = useCallback(async () => {
    if (!completeItem) return;
    setSubmitting(true);
    try {
      await completeWaybillTask(completeItem.id, completeNote.trim() || null);
      setMessage({ type: 'success', text: 'Отмечено как выполнено' });
      setCompleteItem(null);
      setCompleteNote('');
      await loadTasks();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [completeItem, completeNote, loadTasks]);

  const handleFailConfirm = useCallback(async () => {
    if (!failItem) return;
    if (!failNote.trim()) {
      setMessage({ type: 'error', text: 'Укажите причину невыполнения' });
      return;
    }
    setSubmitting(true);
    try {
      await failWaybillTask(failItem.id, failNote.trim());
      setMessage({ type: 'success', text: 'Отмечено как не выполнено' });
      setFailItem(null);
      setFailNote('');
      await loadTasks();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось отметить',
      });
    } finally {
      setSubmitting(false);
    }
  }, [failItem, failNote, loadTasks]);

  const handleReopen = useCallback(
    async (item: WaybillTask) => {
      try {
        await reopenWaybillTask(item.id);
        setMessage({ type: 'success', text: 'Задание возвращено в план' });
        await loadTasks();
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Не удалось вернуть',
        });
      }
    },
    [loadTasks]
  );

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tasks,
    filtered,
    loading,
    statusFilter,
    setStatusFilter,
    message,
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
    searchContracts,
    applyContract,
    refresh: loadTasks,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    currentUserId: user?.id ?? null,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
  };
}

export type WaybillsPageModel = ReturnType<typeof useWaybillsPage>;
