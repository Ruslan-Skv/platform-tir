'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import { type InstallerMaster, getInstallers } from '@/shared/api/admin-crm';
import {
  type FurnitureScheduleEntry,
  type FurnitureScheduleEntryKind,
  type FurnitureScheduleProject,
  addFurnitureScheduleEntry,
  deleteFurnitureScheduleEntry,
  getFurnitureScheduleProject,
  setFurnitureScheduleProjectStatus,
  updateFurnitureScheduleEntry,
  updateFurnitureScheduleProject,
} from '@/shared/api/crm/admin-furniture-schedules';

import {
  type FurnitureProjectFormValues,
  findRepairPackageConflicts,
  formValuesFromProject,
  normalizeFurnitureKzInfo,
  resolveFurnitureTermStartDate,
  todayIsoDate,
} from '../../shared/furniture-schedules';

export function useFurnitureScheduleDetailPage(projectId: string) {
  const router = useRouter();
  const [project, setProject] = useState<FurnitureScheduleProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIsoDate);
  const [entryKind, setEntryKind] = useState<FurnitureScheduleEntryKind>('WEEKLY');
  const [entryText, setEntryText] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<FurnitureProjectFormValues | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<string[] | null>(null);
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProject(await getFurnitureScheduleProject(projectId));
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

  const repairInstallers = installers.filter((i) => i.direction === 'FURNITURE');

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

  const persistEdit = async (values: FurnitureProjectFormValues) => {
    setSubmitting(true);
    setEditError(null);
    try {
      const updated = await updateFurnitureScheduleProject(projectId, {
        status: values.status,
        contractNumber: values.contractNumber.trim() || null,
        installationContractNumber: values.installationContractNumber.trim() || null,
        appliancesContractNumber: values.appliancesContractNumber.trim() || null,
        repairInfo: values.repairInfo.trim() || null,
        reviewInfo: values.reviewInfo.trim() || null,
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
        contractDate: values.contractDate.trim() || null,
        kzInfo: normalizeFurnitureKzInfo(values.kzInfo) || null,
        pauseStartDate: values.pauseStartDate.trim() || null,
        pauseResumeDate: values.pauseResumeDate.trim() || null,
        workPeriodDays: values.workPeriodDays.trim() ? Number(values.workPeriodDays) : null,
        workStartActDate:
          resolveFurnitureTermStartDate(
            values.contractDate,
            values.kzInfo,
            values.workStartActDate
          ) || null,
        workCloseActDate: values.workCloseActDate.trim() || null,
        plannedStartDate:
          resolveFurnitureTermStartDate(
            values.contractDate,
            values.kzInfo,
            values.workStartActDate
          ) || null,
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

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryDate(todayIsoDate());
    setEntryKind('WEEKLY');
    setEntryText('');
  };

  const startEditEntry = (entry: FurnitureScheduleEntry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.date.slice(0, 10));
    setEntryKind(entry.kind);
    setEntryText(entry.text);
    setMessage(null);
  };

  const cancelEditEntry = () => {
    if (submitting) return;
    resetEntryForm();
  };

  const saveEntry = async () => {
    if (!entryText.trim()) {
      setMessage('Укажите текст записи');
      return false;
    }
    setSubmitting(true);
    try {
      if (editingEntryId) {
        setProject(
          await updateFurnitureScheduleEntry(projectId, editingEntryId, {
            date: entryDate,
            kind: entryKind,
            text: entryText.trim(),
          })
        );
      } else {
        setProject(
          await addFurnitureScheduleEntry(projectId, {
            date: entryDate,
            kind: entryKind,
            text: entryText.trim(),
          })
        );
      }
      resetEntryForm();
      return true;
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : editingEntryId
            ? 'Не удалось обновить запись'
            : 'Не удалось добавить запись'
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    setSubmitting(true);
    try {
      setProject(await deleteFurnitureScheduleEntry(projectId, entryId));
      if (editingEntryId === entryId) resetEntryForm();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось удалить запись');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const moveStatus = async (status: 'NEW' | 'IN_PROGRESS' | 'CLAIMS' | 'CLOSED') => {
    setSubmitting(true);
    try {
      setProject(await setFurnitureScheduleProjectStatus(projectId, status));
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
    editingEntryId,
    startEditEntry,
    cancelEditEntry,
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
    saveEntry,
    removeEntry,
    moveStatus,
    back: () => router.push('/admin/crm/furniture-schedules'),
  };
}

export type FurnitureScheduleDetailPageModel = ReturnType<typeof useFurnitureScheduleDetailPage>;
