'use client';

import { CheckIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import type { LeadSource, LeadStatus, UnifiedLeadItem } from '@/shared/api/admin-leads';
import { LEAD_STATUS_LABELS } from '@/shared/api/admin-leads';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import styles from './LeadsInboxPage.module.css';
import { LeadsInboxRulesInfoTip } from './LeadsInboxRulesInfoTip';

type LeadsInboxPageViewProps = {
  model: {
    leads: UnifiedLeadItem[];
    loading: boolean;
    refreshing?: boolean;
    savingId: string | null;
    deletingId?: string | null;
    canDelete?: boolean;
    page: number;
    setPage: (page: number) => void;
    totalPages: number;
    total: number;
    statusStats: Record<string, number>;
    availableSources: { id: string; label: string }[];
    sourceStats?: Partial<Record<LeadSource, number>>;
    sourceFilter: string;
    setSourceFilter: (value: LeadSource | '') => void;
    statusFilter: LeadStatus | '';
    setStatusFilter: (value: LeadStatus | '') => void;
    searchInput: string;
    setSearchInput: (value: string) => void;
    applySearch: () => void;
    loadLeads: () => void | Promise<void>;
    handleStatusChange: (lead: UnifiedLeadItem, status: LeadStatus) => void | Promise<void>;
    handleNoteSave: (lead: UnifiedLeadItem, managerNote: string) => void | Promise<void>;
    handleDelete?: (lead: UnifiedLeadItem) => void | Promise<void>;
    errorMessage: string | null;
    variant?: 'inbox' | 'director';
  };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU');
}

function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return styles.statusBadgeNew;
    case 'contacted':
      return styles.statusBadgeContacted;
    case 'in_progress':
      return styles.statusBadgeIn_progress;
    case 'completed':
      return styles.statusBadgeCompleted;
    case 'cancelled':
      return styles.statusBadgeCancelled;
    default:
      return styles.statusBadgeCompleted;
  }
}

function sourceBadgeClass(source: LeadSource): string {
  switch (source) {
    case 'form_measurement':
      return styles.sourceBadgeMeasurement;
    case 'form_callback':
      return styles.sourceBadgeCallback;
    case 'form_quote':
      return styles.sourceBadgeQuote;
    case 'quiz_mebel':
      return styles.sourceBadgeQuizMebel;
    case 'quiz_remont':
      return styles.sourceBadgeQuizRemont;
    case 'order':
      return styles.sourceBadgeOrder;
    case 'site_feedback':
      return styles.sourceBadgeSiteFeedback;
    case 'knowledge_feedback':
      return styles.sourceBadgeKnowledgeFeedback;
    case 'form_director':
      return styles.sourceBadgeDirector;
    default:
      return styles.sourceBadge;
  }
}

export function LeadsInboxPageView({ model }: LeadsInboxPageViewProps) {
  const {
    leads,
    loading,
    refreshing = false,
    savingId,
    page,
    setPage,
    totalPages,
    total,
    statusStats,
    availableSources,
    sourceStats = {},
    sourceFilter,
    setSourceFilter,
    statusFilter,
    setStatusFilter,
    searchInput,
    setSearchInput,
    applySearch,
    loadLeads,
    handleStatusChange,
    handleNoteSave,
    handleDelete,
    errorMessage,
  } = model;
  const canDelete = Boolean(model.canDelete && handleDelete);
  const deletingId = model.deletingId ?? null;
  const [deleteTarget, setDeleteTarget] = useState<UnifiedLeadItem | null>(null);
  const variant = 'variant' in model && model.variant === 'director' ? 'director' : 'inbox';
  const isDirector = variant === 'director';
  const refreshBusy = loading || refreshing;
  const refreshTitle = isDirector ? 'Обновить список писем' : 'Обновить список заявок';
  const sourceTotal = availableSources.reduce(
    (sum, source) => sum + (sourceStats[source.id as LeadSource] ?? 0),
    0
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{isDirector ? 'Письмо директору' : 'Входящие заявки'}</h1>
            <LeadsInboxRulesInfoTip variant={isDirector ? 'director' : 'inbox'} />
          </div>
        </div>
        <div className={styles.headerActions}>
          <AdminListRefreshButton
            onClick={() => void loadLeads()}
            disabled={refreshBusy}
            busy={refreshBusy}
            title="Обновить"
            aria-label={refreshTitle}
          />
        </div>
      </header>

      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div className={styles.panel}>
        <div className={styles.panelToolbar}>
          <div className={styles.chipRow} role="group" aria-label="Статус заявки">
            <span className={styles.chipRowLabel}>Статус</span>
            <button
              type="button"
              disabled={refreshBusy}
              className={`${styles.filterChip} ${statusFilter === '' ? styles.filterChipActive : ''}`}
              onClick={() => setStatusFilter('')}
            >
              Все ({statusStats.total ?? total})
            </button>
            {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={refreshBusy}
                className={`${styles.filterChip} ${statusFilter === key ? styles.filterChipActive : ''}`}
                onClick={() => setStatusFilter(key as typeof statusFilter)}
              >
                {label} ({statusStats[key] ?? 0})
              </button>
            ))}
          </div>
          <label className={styles.statusSelectRow}>
            <span className={styles.chipRowLabel}>Статус</span>
            <select
              className={styles.select}
              value={statusFilter}
              disabled={refreshBusy}
              aria-label="Статус заявки"
              onChange={(e) => setStatusFilter((e.target.value || '') as LeadStatus | '')}
            >
              <option value="">Все ({statusStats.total ?? total})</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label} ({statusStats[key] ?? 0})
                </option>
              ))}
            </select>
          </label>

          {!isDirector ? (
            <>
              <div
                className={`${styles.chipRow} ${styles.sourceChipRow}`}
                role="group"
                aria-label="Источник заявки"
              >
                <span className={styles.chipRowLabel}>Источник</span>
                <button
                  type="button"
                  disabled={refreshBusy}
                  className={`${styles.filterChip} ${sourceFilter === '' ? styles.filterChipActive : ''}`}
                  onClick={() => setSourceFilter('')}
                >
                  Все ({sourceTotal})
                </button>
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    disabled={refreshBusy}
                    className={`${styles.filterChip} ${sourceFilter === source.id ? styles.filterChipActive : ''}`}
                    onClick={() =>
                      setSourceFilter(sourceFilter === source.id ? '' : (source.id as LeadSource))
                    }
                  >
                    {source.label} ({sourceStats[source.id as LeadSource] ?? 0})
                  </button>
                ))}
              </div>
              <label className={styles.sourceSelectRow}>
                <span className={styles.chipRowLabel}>Источник</span>
                <select
                  className={styles.select}
                  value={sourceFilter}
                  disabled={refreshBusy}
                  aria-label="Источник заявки"
                  onChange={(e) => setSourceFilter((e.target.value || '') as LeadSource | '')}
                >
                  <option value="">Все ({sourceTotal})</option>
                  {availableSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.label} ({sourceStats[source.id as LeadSource] ?? 0})
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <div className={styles.toolbar}>
            <input
              className={styles.searchInput}
              placeholder="Поиск: имя, телефон, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
            />
            <button type="button" className={styles.button} onClick={applySearch}>
              Найти
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : leads.length === 0 ? (
          <div className={styles.empty}>
            {isDirector ? 'Писем не найдено' : 'Заявок не найдено'}
          </div>
        ) : (
          <div className={styles.panelBody}>
            <div className={styles.list}>
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  saving={savingId === lead.id}
                  deleting={deletingId === lead.id}
                  canDelete={canDelete}
                  onStatusChange={handleStatusChange}
                  onNoteSave={handleNoteSave}
                  onDeleteRequest={canDelete ? () => setDeleteTarget(lead) : undefined}
                  hideSourceBadge={isDirector}
                />
              ))}
            </div>
          </div>
        )}

        {totalPages > 1 ? (
          <div className={styles.pagination}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>
            <span className={styles.pageInfo}>
              Страница {page} из {totalPages}
            </span>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Вперёд
            </button>
          </div>
        ) : null}
      </div>

      {deleteTarget && handleDelete ? (
        <ConfirmModal
          isOpen
          title={isDirector ? 'Удалить письмо?' : 'Удалить заявку?'}
          message={
            isDirector
              ? `Письмо от «${deleteTarget.name}» будет удалено без возможности восстановления.`
              : `«${deleteTarget.name}» (${deleteTarget.sourceLabel}) будет удалена без возможности восстановления.`
          }
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            void handleDelete(target);
          }}
          onClose={() => setDeleteTarget(null)}
          confirmText={deletingId === deleteTarget.id ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      ) : null}
    </div>
  );
}

type LeadCardProps = {
  lead: UnifiedLeadItem;
  saving: boolean;
  deleting?: boolean;
  canDelete?: boolean;
  onStatusChange: (lead: UnifiedLeadItem, status: LeadStatus) => void | Promise<void>;
  onNoteSave: (lead: UnifiedLeadItem, managerNote: string) => void | Promise<void>;
  onDeleteRequest?: () => void;
  hideSourceBadge?: boolean;
};

function LeadCard({
  lead,
  saving,
  deleting = false,
  canDelete = false,
  onStatusChange,
  onNoteSave,
  onDeleteRequest,
  hideSourceBadge = false,
}: LeadCardProps) {
  const [noteDraft, setNoteDraft] = useState(lead.managerNote ?? '');
  const busy = saving || deleting;

  useEffect(() => {
    setNoteDraft(lead.managerNote ?? '');
  }, [lead.managerNote, lead.id]);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderMain}>
          {!hideSourceBadge ? (
            <span className={`${styles.sourceBadge} ${sourceBadgeClass(lead.source)}`}>
              {lead.sourceLabel}
            </span>
          ) : null}
          <strong>{lead.name}</strong>
          <span className={`${styles.statusBadge} ${statusBadgeClass(lead.status)}`}>
            {LEAD_STATUS_LABELS[lead.status]}
          </span>
          {lead.phone ? <span>{lead.phone}</span> : null}
          {lead.email ? <span>{lead.email}</span> : null}
        </div>
        <span className={styles.date}>{formatDate(lead.createdAt)}</span>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.preview}>{lead.preview}</p>
        {lead.detailUrl ? (
          <Link href={lead.detailUrl} className={styles.detailLink}>
            Открыть раздел →
          </Link>
        ) : null}
      </div>
      <div className={styles.cardFooter}>
        <label className={styles.statusLabel}>
          Статус
          <select
            className={styles.statusSelect}
            value={lead.status}
            disabled={!lead.statusEditable || busy}
            onChange={(e) => onStatusChange(lead, e.target.value as typeof lead.status)}
            title={lead.statusEditable ? undefined : 'Статус заказа меняется на странице заказа'}
          >
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.noteField}>
          Заметка менеджера
          <textarea
            className={styles.noteInput}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            disabled={busy}
            placeholder="Комментарий для коллег..."
          />
        </label>

        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.iconSaveButton}
            disabled={busy || noteDraft === (lead.managerNote ?? '')}
            onClick={() => onNoteSave(lead, noteDraft)}
            title={saving ? 'Сохранение...' : 'Сохранить заметку'}
            aria-label={saving ? 'Сохранение...' : 'Сохранить заметку'}
          >
            <CheckIcon width={16} height={16} aria-hidden />
          </button>

          {canDelete && onDeleteRequest ? (
            <button
              data-admin-mutation
              type="button"
              className={styles.iconDeleteButton}
              disabled={busy}
              onClick={onDeleteRequest}
              title={deleting ? 'Удаление...' : 'Удалить'}
              aria-label={deleting ? 'Удаление...' : 'Удалить'}
            >
              <DeleteIcon size={16} tone="inherit" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
