'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type CrmUser,
  type Task,
  type TaskStats,
  completeTask,
  createTask,
  deleteTask,
  getCrmUsers,
  getTaskStats,
  getTasks,
  updateTask,
} from '@/shared/api/admin-crm';

import { EMPTY_TASK_FORM, TASKS_PAGE_LIMIT } from '../tasks-page.constants';
import type { PageMessage, TaskFormState } from '../tasks-page.types';

export function useTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [message, setMessage] = useState<PageMessage | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTasks({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        assigneeId: assigneeFilter || undefined,
        type: typeFilter || undefined,
        overdue: overdueFilter || undefined,
        page,
        limit: TASKS_PAGE_LIMIT,
      });
      setTasks(res.data);
      setTotal(res.total);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка загрузки');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, assigneeFilter, typeFilter, overdueFilter, page, showMessage]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getTaskStats(assigneeFilter || undefined);
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [assigneeFilter]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await getCrmUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setForm(EMPTY_TASK_FORM);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? '',
      type: task.type,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assigneeId: task.assigneeId ?? '',
    });
    setModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!form.title.trim()) {
      showMessage('error', 'Укажите название задачи');
      return;
    }
    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          priority: form.priority,
          dueDate: form.dueDate || null,
          assigneeId: form.assigneeId || null,
        });
        showMessage('success', 'Задача обновлена');
      } else {
        await createTask({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          priority: form.priority,
          dueDate: form.dueDate || undefined,
          assigneeId: form.assigneeId || undefined,
        });
        showMessage('success', 'Задача создана');
      }
      setModalOpen(false);
      loadTasks();
      loadStats();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (task: Task) => {
    try {
      await completeTask(task.id);
      showMessage('success', 'Задача отмечена выполненной');
      loadTasks();
      loadStats();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm('Удалить задачу?')) return;
    try {
      await deleteTask(task.id);
      showMessage('success', 'Задача удалена');
      loadTasks();
      loadStats();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return {
    tasks,
    total,
    page,
    setPage,
    loading,
    stats,
    users,
    message,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    typeFilter,
    setTypeFilter,
    overdueFilter,
    setOverdueFilter,
    modalOpen,
    setModalOpen,
    editingTask,
    form,
    setForm,
    saving,
    historyTaskId,
    setHistoryTaskId,
    loadTasks,
    loadStats,
    handleOpenCreate,
    handleOpenEdit,
    handleSaveTask,
    handleComplete,
    handleDelete,
  };
}

export type TasksPageModel = ReturnType<typeof useTasksPage>;
