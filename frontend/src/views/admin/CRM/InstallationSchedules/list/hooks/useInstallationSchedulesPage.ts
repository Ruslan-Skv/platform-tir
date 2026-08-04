'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type InstallerDirection,
  type InstallerMaster,
  getInstallers,
} from '@/shared/api/admin-crm';
import {
  type InstallationSchedule,
  type InstallationScheduleInput,
  completeInstallationSchedule,
  createInstallationSchedule,
  deleteInstallationSchedule,
  failInstallationSchedule,
  getInstallationScheduleTrashCount,
  getInstallationSchedules,
  reopenInstallationSchedule,
  rescheduleInstallationSchedule,
  updateInstallationSchedule,
} from '@/shared/api/crm/admin-installation-schedules';

import {
  type ViewMode,
  emptyForm,
  formFromSchedule,
  monthBounds,
  todayIsoDate,
  weekAheadIsoDate,
} from '../../shared/installation-schedules';

export function useInstallationSchedulesPage() {
  const today = todayIsoDate();
  const [viewModeState, setViewModeState] = useState<ViewMode>(() =>
    typeof window !== 'undefined' &&
    localStorage.getItem('admin_installation_schedules_view_mode') === 'calendar'
      ? 'calendar'
      : 'table'
  );
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(() => weekAheadIsoDate(today));
  const [direction, setDirection] = useState<InstallerDirection | 'ALL'>('ALL');
  const [items, setItems] = useState<InstallationSchedule[]>([]);
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<InstallationSchedule | null>(null);
  const [deleteItem, setDeleteItem] = useState<InstallationSchedule | null>(null);
  const [completeItem, setCompleteItem] = useState<InstallationSchedule | null>(null);
  const [failItem, setFailItem] = useState<InstallationSchedule | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<InstallationSchedule | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [formValues, setFormValues] = useState(() => emptyForm(today));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const refreshTrashCount = useCallback(async () => {
    try {
      setTrashCount(await getInstallationScheduleTrashCount());
    } catch {
      setTrashCount(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await getInstallationSchedules({
          dateFrom,
          dateTo,
          direction: direction === 'ALL' ? undefined : direction,
        })
      );
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить график монтажей');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, direction]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    void getInstallers()
      .then(setInstallers)
      .catch(() => setInstallers([]));
  }, []);
  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount]);

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      localStorage.setItem('admin_installation_schedules_view_mode', mode);
      if (mode === 'calendar') {
        const base = new Date(`${dateFrom || todayIsoDate()}T00:00:00`);
        const bounds = monthBounds(base.getFullYear(), base.getMonth());
        setDateFrom(bounds.from);
        setDateTo(bounds.to);
      }
    },
    [dateFrom]
  );

  const save = useCallback(
    async (editing: boolean, event: React.FormEvent): Promise<boolean> => {
      event.preventDefault();
      if (!formValues.date) {
        setFormError('Укажите дату монтажа');
        return false;
      }
      if (!formValues.manualInstaller && !formValues.installerId) {
        setFormError('Выберите монтажника или включите ручной ввод');
        return false;
      }
      if (formValues.manualInstaller && !formValues.installerName.trim()) {
        setFormError('Укажите имя монтажника');
        return false;
      }
      const phones = formValues.customerPhones.map((phone) => phone.trim()).filter(Boolean);
      const selectedInstaller = installers.find((row) => row.id === formValues.installerId);
      const input: InstallationScheduleInput = {
        date: formValues.date,
        timeFrom: formValues.timeFrom || null,
        timeTo: formValues.timeTo || null,
        timeText: formValues.timeText.trim() || null,
        direction: formValues.direction,
        installerId: formValues.manualInstaller ? null : formValues.installerId || null,
        installerName: formValues.manualInstaller
          ? formValues.installerName.trim()
          : selectedInstaller?.fullName || formValues.installerName.trim() || null,
        packageId: formValues.packageId || null,
        contractId: formValues.contractId || null,
        contractNumber: formValues.contractNumber.trim() || null,
        workOrderKey: formValues.workOrderKey || null,
        workOrderLabel: formValues.workOrderLabel.trim() || null,
        customerName: formValues.customerName.trim() || null,
        customerAddress: formValues.customerAddress.trim() || null,
        customerPhone: phones[0] || null,
        customerPhones: phones,
        orderInfo: formValues.orderInfo.trim() || null,
        note: formValues.note.trim() || null,
      };
      setSubmitting(true);
      setFormError(null);
      try {
        if (editing && editItem) await updateInstallationSchedule(editItem.id, input);
        else await createInstallationSchedule(input);
        setCreateOpen(false);
        setEditItem(null);
        await refresh();
        return true;
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Не удалось сохранить запись');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [editItem, formValues, installers, refresh]
  );

  const openCreate = useCallback(
    (date = dateFrom || todayIsoDate()) => {
      setFormValues(emptyForm(date));
      setFormError(null);
      setCreateOpen(true);
    },
    [dateFrom]
  );
  const openEdit = useCallback((item: InstallationSchedule) => {
    setFormValues(formFromSchedule(item));
    setFormError(null);
    setEditItem(item);
  }, []);
  const closeForm = useCallback(() => {
    setCreateOpen(false);
    setEditItem(null);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      setSubmitting(true);
      setMessage(null);
      try {
        await action();
        await refresh();
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Операция не выполнена');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [refresh]
  );

  const calendar = useMemo(() => {
    const base = new Date(`${dateFrom || todayIsoDate()}T00:00:00`);
    return { year: base.getFullYear(), month: base.getMonth() };
  }, [dateFrom]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    direction,
    setDirection,
    items,
    installers,
    loading,
    message,
    setMessage,
    viewMode: viewModeState,
    setViewMode,
    calendar,
    createOpen,
    editItem,
    deleteItem,
    setDeleteItem,
    completeItem,
    setCompleteItem,
    failItem,
    setFailItem,
    rescheduleItem,
    setRescheduleItem,
    statusNote,
    setStatusNote,
    rescheduleDate,
    setRescheduleDate,
    formValues,
    setFormValues,
    formError,
    submitting,
    refresh,
    openCreate,
    openEdit,
    closeForm,
    saveCreate: (event: React.FormEvent) => save(false, event),
    saveEdit: (event: React.FormEvent) => save(true, event),
    deleteSelected: async () => {
      if (!deleteItem) return false;
      const ok = await run(() => deleteInstallationSchedule(deleteItem.id));
      if (ok) {
        setDeleteItem(null);
        await refreshTrashCount();
      }
      return ok;
    },
    completeSelected: async () => {
      if (!completeItem) return false;
      const ok = await run(() => completeInstallationSchedule(completeItem.id, statusNote || null));
      if (ok) {
        setCompleteItem(null);
        setStatusNote('');
      }
      return ok;
    },
    failSelected: async () => {
      if (!failItem) return false;
      if (!statusNote.trim()) {
        setMessage('Укажите причину невыполнения');
        return false;
      }
      const ok = await run(() => failInstallationSchedule(failItem.id, statusNote));
      if (ok) {
        setFailItem(null);
        setStatusNote('');
      }
      return ok;
    },
    reopen: (item: InstallationSchedule) => run(() => reopenInstallationSchedule(item.id)),
    openReschedule: (item: InstallationSchedule) => {
      setRescheduleItem(item);
      const date = new Date(`${item.date.slice(0, 10)}T00:00:00`);
      date.setDate(date.getDate() + 1);
      setRescheduleDate(date.toLocaleDateString('en-CA'));
    },
    confirmReschedule: async () => {
      if (!rescheduleItem || !rescheduleDate) return false;
      const ok = await run(() =>
        rescheduleInstallationSchedule(rescheduleItem.id, { date: rescheduleDate })
      );
      if (ok) setRescheduleItem(null);
      return ok;
    },
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
  };
}

export type InstallationSchedulesPageModel = ReturnType<typeof useInstallationSchedulesPage>;
