'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { TaskHistoryModal } from './TaskHistoryModal';
import styles from './TasksPage.module.css';

const TYPE_LABELS: Record<string, string> = {
  TODO: 'Задача',
  CALL: 'Звонок',
  EMAIL: 'Email',
  MEETING: 'Встреча',
  FOLLOW_UP: 'Продолжение',
  REMINDER: 'Напоминание',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  CANCELLED: 'Отменена',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

function formatUser(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

interface TaskFormState {
  title: string;
  description: string;
  type: string;
  priority: string;
  dueDate: string;
  assigneeId: string;
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  type: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  assigneeId: '',
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
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
        limit: 20,
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
    setForm(emptyForm);
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

  const columns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Задача',
        render: (t: Task) => (
          <div>
            <div className={styles.taskTitle}>{t.title}</div>
            {t.description && (
              <div className={styles.taskDescription}>
                {t.description.length > 60 ? t.description.slice(0, 60) + '…' : t.description}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        title: 'Тип',
        render: (t: Task) => TYPE_LABELS[t.type] ?? t.type,
      },
      {
        key: 'priority',
        title: 'Приоритет',
        render: (t: Task) => (
          <span className={`${styles.badge} ${styles[`badge${t.priority}`]}`}>
            {PRIORITY_LABELS[t.priority] ?? t.priority}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Статус',
        render: (t: Task) => (
          <span className={`${styles.badge} ${styles[`badge${t.status}`]}`}>
            {STATUS_LABELS[t.status] ?? t.status}
          </span>
        ),
      },
      {
        key: 'dueDate',
        title: 'Срок',
        render: (t: Task) => formatDate(t.dueDate),
      },
      {
        key: 'assignee',
        title: 'Исполнитель',
        render: (t: Task) => formatUser(t.assignee),
      },
      {
        key: 'customer',
        title: 'Клиент',
        render: (t: Task) =>
          t.customer
            ? [t.customer.firstName, t.customer.lastName].filter(Boolean).join(' ') || '—'
            : '—',
      },
      {
        key: 'createdBy',
        title: 'Создал',
        render: (t: Task) => formatUser(t.createdBy),
      },
      {
        key: 'actions',
        title: '',
        render: (t: Task) => (
          <div className={styles.rowActions}>
            {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
              <button
                type="button"
                className={`${styles.smallBtn} ${styles.primary}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleComplete(t);
                }}
                title="Отметить выполненной"
              >
                ✓
              </button>
            )}
            <button
              type="button"
              className={styles.smallBtn}
              onClick={(e) => {
                e.stopPropagation();
                setHistoryTaskId(t.id);
              }}
              title="История"
            >
              История
            </button>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(t);
              }}
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              type="button"
              className={`${styles.smallBtn} ${styles.danger}`}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(t);
              }}
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        ),
      },
    ],
    [handleComplete, handleOpenEdit, handleDelete]
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Задачи</h1>
          <span className={styles.count}>{total} задач</span>
        </div>
        <button type="button" className={styles.addButton} onClick={handleOpenCreate}>
          + Добавить задачу
        </button>
      </div>

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Ожидают</div>
            <div className={styles.statValue}>{stats.pending}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>В работе</div>
            <div className={styles.statValue}>{stats.inProgress}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Выполнены</div>
            <div className={styles.statValue}>{stats.completed}</div>
          </div>
          <div className={`${styles.statCard} ${styles.overdue}`}>
            <div className={styles.statLabel}>Просрочены</div>
            <div className={styles.statValue}>{stats.overdue}</div>
          </div>
        </div>
      )}

      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">Все приоритеты</option>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="">Все исполнители</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Все типы</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className={styles.filterLabel}>
          <input
            type="checkbox"
            checked={overdueFilter}
            onChange={(e) => setOverdueFilter(e.target.checked)}
          />
          Просроченные
        </label>
      </div>

      {message && (
        <div className={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
          {message.text}
        </div>
      )}

      <DataTable
        data={tasks}
        columns={columns}
        keyExtractor={(t) => t.id}
        loading={loading}
        emptyMessage="Нет задач"
        pagination={{
          page,
          limit: 20,
          total,
          onPageChange: setPage,
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingTask ? 'Редактировать задачу' : 'Новая задача'}
      >
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label>Название *</label>
            <input
              type="text"
              className={styles.formInput}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Название задачи"
            />
          </div>
          <div className={styles.formRow}>
            <label>Описание</label>
            <textarea
              className={styles.formTextarea}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Описание"
            />
          </div>
          <div className={styles.formRow}>
            <label>Тип</label>
            <select
              className={styles.formSelect}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>Приоритет</label>
            <select
              className={styles.formSelect}
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>Срок</label>
            <input
              type="date"
              className={styles.formInput}
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div className={styles.formRow}>
            <label>Исполнитель</label>
            <select
              className={styles.formSelect}
              value={form.assigneeId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            >
              <option value="">— Не назначен —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSaveTask}
              disabled={saving}
            >
              {saving ? 'Сохранение…' : editingTask ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </Modal>

      {historyTaskId && (
        <TaskHistoryModal
          taskId={historyTaskId}
          taskTitle={tasks.find((t) => t.id === historyTaskId)?.title}
          users={users}
          onClose={() => setHistoryTaskId(null)}
          onRollback={() => {
            loadTasks();
            loadStats();
            setHistoryTaskId(null);
          }}
        />
      )}
    </div>
  );
}
