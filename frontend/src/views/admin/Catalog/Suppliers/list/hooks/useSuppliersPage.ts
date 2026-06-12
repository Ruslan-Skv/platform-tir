'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../suppliers-page.constants';
import type { ColumnKey, Supplier } from '../suppliers-page.types';
import {
  ensureActionsColumn,
  loadColumnSettings,
  saveColumnSettings,
} from '../suppliers-page.utils';

export function useSuppliersPage() {
  const { getAuthHeaders } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    supplier: Supplier | null;
  }>({ isOpen: false, supplier: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([]);

  const openDeleteModal = (supplier: Supplier) => {
    setDeleteModal({ isOpen: true, supplier });
    setDeleteError(null);
  };

  useEffect(() => {
    setSelectedColumns(ensureActionsColumn(loadColumnSettings()));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  const toggleColumn = (columnKey: ColumnKey) => {
    if (columnKey === 'actions') return;

    setSelectedColumns((prev) => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey];
      const result = ensureActionsColumn(newColumns);
      saveColumnSettings(result);
      return result;
    });
  };

  const handleDragStart = (e: React.DragEvent, columnKey: ColumnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }

    if (draggedColumn === 'actions' || targetKey === 'actions') {
      setDraggedColumn(null);
      return;
    }

    setSelectedColumns((prev) => {
      const newColumns = [...prev];
      const draggedIndex = newColumns.indexOf(draggedColumn);
      const targetIndex = newColumns.indexOf(targetKey);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }

      newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);

      const actionsIndex = newColumns.indexOf('actions');
      if (actionsIndex !== -1 && actionsIndex !== newColumns.length - 1) {
        newColumns.splice(actionsIndex, 1);
        newColumns.push('actions');
      }

      saveColumnSettings(newColumns);
      return newColumns;
    });

    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const moveColumn = (columnKey: ColumnKey, direction: 'up' | 'down') => {
    if (columnKey === 'actions') return;

    setSelectedColumns((prev) => {
      const index = prev.indexOf(columnKey);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;

      const actionsIndex = prev.indexOf('actions');
      if (direction === 'down' && index === actionsIndex - 1) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newColumns = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newColumns[newIndex] === 'actions') return prev;

      [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];

      saveColumnSettings(newColumns);
      return newColumns;
    });
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }

      const response = await apiFetch(`${API_URL}/admin/catalog/suppliers?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [search, getAuthHeaders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, supplier: null });
    setDeleteError(null);
  };

  const handleDeleteSupplier = async () => {
    if (!deleteModal.supplier) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await apiFetch(
        `${API_URL}/admin/catalog/suppliers/${deleteModal.supplier.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        closeDeleteModal();
        fetchSuppliers();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message || 'Ошибка при удалении поставщика');
      }
    } catch {
      setDeleteError('Ошибка сети при удалении поставщика');
    } finally {
      setDeleting(false);
    }
  };

  return {
    suppliers,
    loading,
    search,
    setSearch,
    deleteModal,
    deleting,
    deleteError,
    showColumnSelector,
    setShowColumnSelector,
    columnSelectorRef,
    draggedColumn,
    selectedColumns,
    openDeleteModal,
    toggleColumn,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    moveColumn,
    closeDeleteModal,
    handleDeleteSupplier,
  };
}

export type SuppliersPageModel = ReturnType<typeof useSuppliersPage>;
