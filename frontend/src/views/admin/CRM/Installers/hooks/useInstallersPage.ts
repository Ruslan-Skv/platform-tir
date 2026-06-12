'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type InstallerDirection,
  type InstallerMaster,
  createInstaller,
  deleteInstaller,
  getInstallers,
  updateInstaller,
} from '@/shared/api/admin-crm';

import { EMPTY_INSTALLER_FORM } from '../installers-page.constants';
import type { InstallerFormValues, InstallersPageMessage } from '../installers-page.types';
import {
  extractGradeRank,
  gradeForApi,
  gradeForForm,
  isRepairInstallerDirection,
} from '../installers-page.utils';

export function useInstallersPage() {
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<InstallerDirection | 'ALL'>('ALL');
  const [message, setMessage] = useState<InstallersPageMessage | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InstallerMaster | null>(null);
  const [deleteItem, setDeleteItem] = useState<InstallerMaster | null>(null);

  const [formValues, setFormValues] = useState<InstallerFormValues>(EMPTY_INSTALLER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadInstallers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInstallers();
      setInstallers(data);
    } catch (err) {
      setInstallers([]);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить мастеров',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInstallers();
  }, [loadInstallers]);

  const filtered = useMemo(() => {
    const byDirection =
      directionFilter === 'ALL'
        ? installers
        : installers.filter((item) => item.direction === directionFilter);

    return [...byDirection].sort((a, b) => {
      const gradeDiff = extractGradeRank(a.grade) - extractGradeRank(b.grade);
      if (gradeDiff !== 0) return gradeDiff;
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [installers, directionFilter]);

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_INSTALLER_FORM);
    setFormError(null);
    setSubmitting(false);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setCreateModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((item: InstallerMaster) => {
    setFormValues({
      direction: item.direction,
      fullName: item.fullName,
      grade: gradeForForm(item.direction, item.grade),
    });
    setFormError(null);
    setSubmitting(false);
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

  const validateForm = useCallback(() => {
    if (!formValues.fullName.trim()) return 'Укажите ФИО мастера';
    if (isRepairInstallerDirection(formValues.direction) && !formValues.grade.trim()) {
      return 'Укажите разряд мастера';
    }
    return null;
  }, [formValues]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createInstaller({
        direction: formValues.direction,
        fullName: formValues.fullName.trim(),
        grade: gradeForApi(formValues.direction, formValues.grade),
      });
      setCreateModalOpen(false);
      resetForm();
      setMessage({ type: 'success', text: 'Мастер добавлен' });
      await loadInstallers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось добавить мастера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await updateInstaller(editItem.id, {
        direction: formValues.direction,
        fullName: formValues.fullName.trim(),
        grade: gradeForApi(formValues.direction, formValues.grade),
      });
      setEditItem(null);
      resetForm();
      setMessage({ type: 'success', text: 'Карточка мастера обновлена' });
      await loadInstallers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось обновить мастера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      await deleteInstaller(deleteItem.id);
      setDeleteItem(null);
      setMessage({ type: 'success', text: 'Мастер удалён' });
      await loadInstallers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось удалить мастера',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    installers,
    filtered,
    loading,
    directionFilter,
    setDirectionFilter,
    message,
    createModalOpen,
    editItem,
    deleteItem,
    setDeleteItem,
    formValues,
    setFormValues,
    formError,
    submitting,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    closeEditModal,
    handleCreate,
    handleEdit,
    handleDelete,
  };
}

export type InstallersPageModel = ReturnType<typeof useInstallersPage>;
