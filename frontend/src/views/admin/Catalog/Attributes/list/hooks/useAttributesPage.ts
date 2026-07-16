'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type AdminAttribute,
  createAdminAttribute,
  deleteAdminAttribute,
  fetchAdminAttributesList,
  updateAdminAttribute,
} from '@/shared/api/admin-attributes';

import type { AttributeFormState, AttributesToast } from '../attributes-page.types';
import { isListAttributeType } from '../attributes-page.utils';

export function useAttributesPage() {
  const { getAuthHeaders } = useAuth();
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<AttributesToast | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<AdminAttribute | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    attribute: AdminAttribute | null;
  }>({ isOpen: false, attribute: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = useCallback((text: string, type: AttributesToast['type']) => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAttributes = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetchAdminAttributesList(
          { search, limit: 500, page: 1 },
          getAuthHeaders()
        );
        setAttributes(res.data);
        setTotal(res.total);
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Ошибка загрузки', 'err');
        setAttributes([]);
        setTotal(0);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [search, getAuthHeaders, showToast]
  );

  useEffect(() => {
    void fetchAttributes();
  }, [fetchAttributes]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const handleCreate = async (form: AttributeFormState) => {
    setSaving(true);
    try {
      const values = isListAttributeType(form.type)
        ? form.optionRows
            .map((v) => v.trim())
            .filter(Boolean)
            .map((value) => ({ value }))
        : undefined;
      await createAdminAttribute({
        name: form.name.trim(),
        slug: form.slug.trim(),
        type: form.type,
        unit: form.unit.trim() || null,
        isFilterable: form.isFilterable,
        values,
      });
      setShowCreateModal(false);
      showToast('Характеристика создана', 'ok');
      await fetchAttributes({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: AttributeFormState) => {
    if (!editingAttribute) return;
    setSaving(true);
    try {
      const values = isListAttributeType(form.type)
        ? form.optionRows
            .map((v) => v.trim())
            .filter(Boolean)
            .map((value) => ({ value }))
        : [];
      await updateAdminAttribute(editingAttribute.id, {
        name: form.name.trim(),
        slug: form.slug.trim(),
        type: form.type,
        unit: form.unit.trim() || null,
        isFilterable: form.isFilterable,
        values,
      });
      setEditingAttribute(null);
      showToast('Характеристика обновлена', 'ok');
      await fetchAttributes({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (attribute: AdminAttribute) => {
    setDeleteModal({ isOpen: true, attribute });
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, attribute: null });
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deleteModal.attribute) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAdminAttribute(deleteModal.attribute.id);
      closeDeleteModal();
      showToast('Характеристика удалена', 'ok');
      await fetchAttributes({ silent: true });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  return {
    attributes,
    total,
    loading,
    searchInput,
    setSearchInput,
    saving,
    toast,
    showCreateModal,
    setShowCreateModal,
    editingAttribute,
    setEditingAttribute,
    deleteModal,
    deleting,
    deleteError,
    fetchAttributes,
    handleCreate,
    handleUpdate,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  };
}

export type AttributesPageModel = ReturnType<typeof useAttributesPage>;
