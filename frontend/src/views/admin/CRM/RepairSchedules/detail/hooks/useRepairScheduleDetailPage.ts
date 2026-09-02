'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import { type InstallerMaster, getInstallers } from '@/shared/api/admin-crm';
import {
  type RepairScheduleEntryKind,
  type RepairScheduleProject,
  addRepairScheduleEntry,
  deleteRepairScheduleEntry,
  getRepairScheduleProject,
  setRepairScheduleProjectStatus,
  updateRepairScheduleProject,
} from '@/shared/api/crm/admin-repair-schedules';

import {
  type RepairProjectFormValues,
  findRepairPackageConflicts,
  formValuesFromProject,
  todayIsoDate,
} from '../../shared/repair-schedules';

export function useRepairScheduleDetailPage(projectId: string) {
  const router = useRouter();
  const [project, setProject] = useState<RepairScheduleProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIsoDate);
  const [entryKind, setEntryKind] = useState<RepairScheduleEntryKind>('WEEKLY');
  const [entryText, setEntryText] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<RepairProjectFormValues | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<string[] | null>(null);
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProject(await getRepairScheduleProject(projectId));
    } catch (err) {
      setProject(null);
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить проект');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void getInstallers()
      .then(setInstallers)
      .catch(() => setInstallers([]));
  }, []);

  const repairInstallers = installers.filter((i) => i.directions?.includes('REPAIR'));

  const openEdit = () => {
    if (!project) return;
    setEditValues(formValuesFromProject(project));
    setEditError(null);
    setPendingConflicts(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (submitting) return;
    setEditOpen(false);
    setEditValues(null);
    setEditError(null);
    setPendingConflicts(null);
  };

  const persistEdit = async (values: RepairProjectFormValues) => {
    setSubmitting(true);
    setEditError(null);
    try {
      const updated = await updateRepairScheduleProject(projectId, {
        status: values.status,
        contractNumber: values.contractNumber.trim() || null,
        workScope: values.workScope.trim() || null,
        installerId: values.manualInstaller ? null : values.installerId.trim() || null,
        installerName: values.manualInstaller
          ? values.installerName.trim() || null
          : values.installerId.trim()
            ? null
            : values.installerName.trim() || null,
        packageId: values.packageId.trim() || null,
        contractId: values.contractId.trim() || null,
        customerName: values.customerName.trim() || null,
        customerAddress: values.customerAddress.trim() || null,
        customerPhone: values.customerPhone.trim() || null,
        contractSum: values.contractSum.trim() ? Number(values.contractSum) : null,
        payoutSum: values.payoutSum.trim() ? Number(values.payoutSum) : null,
        workPeriodDays: values.workPeriodDays.trim() ? Number(values.workPeriodDays) : null,
        workStartActDate: values.workStartActDate.trim() || null,
        workCloseActDate: values.workCloseActDate.trim() || null,
        plannedStartDate: values.plannedStartDate.trim() || null,
        note: values.note.trim() || null,
      });
      setProject(updated);
      setEditOpen(false);
      setEditValues(null);
      setPendingConflicts(null);
      return true;
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Не удалось сохранить');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const requestSaveEdit = async () => {
    if (!editValues) return false;
    if (!editValues.contractNumber.trim() && !editValues.packageId.trim()) {
      setEditError('Укажите номер договора или выберите пакет');
      return false;
    }

    const packageId = editValues.packageId.trim();
    if (packageId) {
      try {
        const pkg = await getContractDocumentPackage(packageId);
        const conflicts = findRepairPackageConflicts(editValues, pkg);
        if (conflicts.length > 0) {
          setPendingConflicts(conflicts);
          return false;
        }
      } catch {
        // пакет недоступен — сохраняем без сверки
      }
    }

    return persistEdit(editValues);
  };

  const confirmConflictSave = async () => {
    if (!editValues) return false;
    setPendingConflicts(null);
    return persistEdit(editValues);
  };

  const addEntry = async () => {
    if (!entryText.trim()) {
      setMessage('Укажите текст записи');
      return false;
    }
    setSubmitting(true);
    try {
      setProject(
        await addRepairScheduleEntry(projectId, {
          date: entryDate,
          kind: entryKind,
          text: entryText.trim(),
        })
      );
      setEntryText('');
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось добавить запись');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    setSubmitting(true);
    try {
      setProject(await deleteRepairScheduleEntry(projectId, entryId));
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось удалить запись');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const moveStatus = async (status: 'NEW' | 'IN_PROGRESS' | 'CLOSED') => {
    setSubmitting(true);
    try {
      setProject(await setRepairScheduleProjectStatus(projectId, status));
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось сменить статус');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    project,
    loading,
    message,
    setMessage,
    submitting,
    entryDate,
    setEntryDate,
    entryKind,
    setEntryKind,
    entryText,
    setEntryText,
    editOpen,
    editValues,
    setEditValues,
    editError,
    pendingConflicts,
    setPendingConflicts,
    repairInstallers,
    openEdit,
    closeEdit,
    requestSaveEdit,
    confirmConflictSave,
    refresh,
    addEntry,
    removeEntry,
    moveStatus,
    back: () => router.push('/admin/crm/repair-schedules'),
  };
}

export type RepairScheduleDetailPageModel = ReturnType<typeof useRepairScheduleDetailPage>;
