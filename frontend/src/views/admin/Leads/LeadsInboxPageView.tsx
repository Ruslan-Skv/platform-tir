'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { LEAD_STATUS_LABELS } from '@/shared/api/admin-leads';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';

import styles from './LeadsInboxPage.module.css';
import type { LeadsInboxPageModel } from './hooks/useLeadsInboxPage';

type LeadsInboxPageViewProps = {
  model: LeadsInboxPageModel;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU');
}

export function LeadsInboxPageView({ model }: LeadsInboxPageViewProps) {
  const {
    leads,
    loading,
    savingId,
    page,
    setPage,
    totalPages,
    total,
    statusStats,
    availableSources,
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
    errorMessage,
  } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Входящие заявки</h1>
        <p className={styles.subtitle}>
          Единая лента обращений с сайта: формы, квизы, заказы и обратная связь. Статусы и заметки
          сохраняются в соответствующих разделах.
        </p>
      </header>

      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div className={styles.statsRow}>
        <button
          type="button"
          className={`${styles.statChip} ${statusFilter === '' ? styles.statChipActive : ''}`}
          onClick={() => setStatusFilter('')}
        >
          Все: {statusStats.total ?? total}
        </button>
        {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`${styles.statChip} ${statusFilter === key ? styles.statChipActive : ''}`}
            onClick={() => setStatusFilter(key as typeof statusFilter)}
          >
            {label}: {statusStats[key] ?? 0}
          </button>
        ))}
      </div>

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
        <select
          className={styles.select}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
          aria-label="Источник заявки"
        >
          <option value="">Все источники</option>
          {availableSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
        <button type="button" className={styles.button} onClick={applySearch}>
          Найти
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={loadLeads}
          disabled={loading}
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : leads.length === 0 ? (
        <p className={styles.empty}>Заявок не найдено</p>
      ) : (
        <div className={styles.list}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              saving={savingId === lead.id}
              onStatusChange={handleStatusChange}
              onNoteSave={handleNoteSave}
            />
          ))}
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
  );
}

type LeadCardProps = {
  lead: LeadsInboxPageModel['leads'][number];
  saving: boolean;
  onStatusChange: LeadsInboxPageModel['handleStatusChange'];
  onNoteSave: LeadsInboxPageModel['handleNoteSave'];
};

function LeadCard({ lead, saving, onStatusChange, onNoteSave }: LeadCardProps) {
  const [noteDraft, setNoteDraft] = useState(lead.managerNote ?? '');

  useEffect(() => {
    setNoteDraft(lead.managerNote ?? '');
  }, [lead.managerNote, lead.id]);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderMain}>
          <span className={styles.sourceBadge}>{lead.sourceLabel}</span>
          <strong>{lead.name}</strong>
          {lead.phone ? <span>{lead.phone}</span> : null}
          {lead.email ? <span>{lead.email}</span> : null}
        </div>
        <span className={styles.date}>{formatDate(lead.createdAt)}</span>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.preview}>{lead.preview}</p>
      </div>
      <div className={styles.cardFooter}>
        <label className={styles.statusLabel}>
          Статус
          <select
            className={styles.statusSelect}
            value={lead.status}
            disabled={!lead.statusEditable || saving}
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
            disabled={saving}
            placeholder="Комментарий для коллег..."
          />
        </label>

        <button
          type="button"
          className={styles.button}
          disabled={saving || noteDraft === (lead.managerNote ?? '')}
          onClick={() => onNoteSave(lead, noteDraft)}
        >
          {saving ? 'Сохранение...' : 'Сохранить заметку'}
        </button>

        {lead.detailUrl ? (
          <Link href={lead.detailUrl} className={styles.detailLink}>
            Открыть раздел →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
