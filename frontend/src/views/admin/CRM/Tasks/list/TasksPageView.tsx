'use client';

import { useMemo } from 'react';

import type { Task } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { TaskHistoryModal } from '../modals/TaskHistoryModal';
import styles from './TasksPage.module.css';
import type { TasksPageModel } from './hooks/useTasksPage';
import {
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TASKS_PAGE_LIMIT,
  TYPE_LABELS,
  TYPE_OPTIONS,
} from './tasks-page.constants';
import { formatDate, formatUser } from './tasks-page.utils';

type TasksPageViewProps = {
  model: TasksPageModel;
};

export function TasksPageView({ model }: TasksPageViewProps) {
  const {
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
  } = model;

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
    [handleComplete, handleOpenEdit, handleDelete, setHistoryTaskId]
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
          limit: TASKS_PAGE_LIMIT,
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
