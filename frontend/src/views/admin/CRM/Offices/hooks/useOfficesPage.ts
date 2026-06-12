'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type Office,
  createOffice,
  deleteOffice,
  getOffices,
  updateOffice,
} from '@/shared/api/admin-crm';

import { EMPTY_OFFICE_FORM } from '../offices-page.constants';
import type { OfficeFormData, OfficesPageMessage } from '../offices-page.types';

export function useOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<OfficesPageMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OfficeFormData>(EMPTY_OFFICE_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState<OfficeFormData>(EMPTY_OFFICE_FORM);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [historyOfficeId, setHistoryOfficeId] = useState<string | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadOffices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOffices(showInactive);
      setOffices(data);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки офисов');
    } finally {
      setLoading(false);
    }
  }, [showInactive, showMessage]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  const handleStartEdit = useCallback((office: Office) => {
    setEditingId(office.id);
    setEditForm({
      name: office.name,
      prefix: office.prefix ?? '',
      address: office.address ?? '',
      phone: office.phone ?? '',
      isActive: office.isActive,
      sortOrder: office.sortOrder,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(EMPTY_OFFICE_FORM);
  }, []);

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) {
      showMessage('error', 'Укажите название офиса');
      return;
    }
    setSaving(true);
    try {
      await updateOffice(editingId, {
        name: editForm.name.trim(),
        prefix: editForm.prefix.trim() || null,
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
        isActive: editForm.isActive,
        sortOrder: editForm.sortOrder,
      });
      showMessage('success', 'Офис обновлён');
      setEditingId(null);
      setEditForm(EMPTY_OFFICE_FORM);
      await loadOffices();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOffice = async () => {
    if (!newForm.name.trim()) {
      showMessage('error', 'Укажите название офиса');
      return;
    }
    setSaving(true);
    try {
      await createOffice({
        name: newForm.name.trim(),
        prefix: newForm.prefix.trim() || undefined,
        address: newForm.address.trim() || undefined,
        phone: newForm.phone.trim() || undefined,
        isActive: newForm.isActive,
        sortOrder: newForm.sortOrder,
      });
      showMessage('success', 'Офис добавлен');
      setShowAddForm(false);
      setNewForm(EMPTY_OFFICE_FORM);
      await loadOffices();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка создания офиса');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteOffice(id);
      showMessage('success', 'Офис удалён');
      setDeleteConfirmId(null);
      await loadOffices();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setSaving(false);
    }
  };

  const cancelAddForm = useCallback(() => {
    setShowAddForm(false);
    setNewForm(EMPTY_OFFICE_FORM);
  }, []);

  const handleHistoryRollback = useCallback(() => {
    void loadOffices();
    setHistoryOfficeId(null);
  }, [loadOffices]);

  return {
    offices,
    loading,
    saving,
    message,
    editingId,
    editForm,
    setEditForm,
    showAddForm,
    setShowAddForm,
    newForm,
    setNewForm,
    showInactive,
    setShowInactive,
    deleteConfirmId,
    setDeleteConfirmId,
    historyOfficeId,
    setHistoryOfficeId,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleAddOffice,
    handleDelete,
    cancelAddForm,
    handleHistoryRollback,
  };
}

export type OfficesPageModel = ReturnType<typeof useOfficesPage>;
