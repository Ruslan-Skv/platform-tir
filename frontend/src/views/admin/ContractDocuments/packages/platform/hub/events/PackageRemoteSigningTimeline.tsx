'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';

import { useCallback, useEffect, useState } from 'react';

import {
  type ContractDocumentSigningSessionListItem,
  listPackageSigningSessions,
  remoteSigningStatusLabel,
} from '@/shared/api/contract-documents/admin-contract-document-signing';
import crmDetailStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerDetailModal.module.css';

import styles from './PackageRemoteSigningTimeline.module.css';

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type SigningEvent = {
  date: string;
  text: string;
  tone?: 'signed' | 'rejected';
};

function sessionEvents(s: ContractDocumentSigningSessionListItem): SigningEvent[] {
  const events: SigningEvent[] = [];
  events.push({
    date: s.createdAt,
    text: `Ссылка на подписание отправлена${s.customerName ? ` — ${s.customerName}` : ''}${
      s.customerEmail ? ` (${s.customerEmail})` : ''
    }`,
  });
  if (s.viewedAt) {
    events.push({ date: s.viewedAt, text: 'Документы открыты клиентом' });
  }
  if (s.signedAt) {
    events.push({
      date: s.signedAt,
      text: `Подписано${s.signedName ? ` — ${s.signedName}` : ''}`,
      tone: 'signed',
    });
  }
  if (s.rejectedAt) {
    events.push({
      date: s.rejectedAt,
      text: `Отклонено клиентом${s.rejectionReason ? ` — ${s.rejectionReason}` : ''}`,
      tone: 'rejected',
    });
  }
  if (!s.signedAt && !s.rejectedAt && s.status === 'EXPIRED') {
    events.push({ date: s.expiresAt, text: 'Срок действия ссылки истёк' });
  }
  if (!s.signedAt && !s.rejectedAt && s.status === 'CANCELLED') {
    events.push({ date: '', text: 'Ссылка отозвана менеджером' });
  }
  return events;
}

function statusClassName(status: ContractDocumentSigningSessionListItem['status']): string {
  if (status === 'SIGNED') return styles.sessionStatusSigned;
  if (status === 'REJECTED') return styles.sessionStatusRejected;
  if (status === 'PENDING' || status === 'VIEWED') return styles.sessionStatusPending;
  return styles.sessionStatus;
}

function signedDocLabel(status: ContractDocumentSigningSessionListItem['status']): string {
  return status === 'SIGNED' ? ' (подписаны)' : ' (отправлены на подписание)';
}

export type PackageRemoteSigningTimelineProps = {
  packageId: string;
  /** Перегрузить события (например, после обновления пакета). */
  reloadToken?: number;
  onError?: (message: string) => void;
};

/** Тайм-лайн электронного подписания: сессии и их события (отправка, просмотр, подпись, отказ). */
export function PackageRemoteSigningTimeline({
  packageId,
  reloadToken = 0,
  onError,
}: PackageRemoteSigningTimelineProps) {
  const [sessions, setSessions] = useState<ContractDocumentSigningSessionListItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const list = await listPackageSigningSessions(packageId);
      setSessions(list);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Не удалось загрузить события подписания');
    } finally {
      setBusy(false);
    }
  }, [packageId, onError]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  return (
    <div>
      <div className={styles.sectionHead}>
        <h4 className={crmDetailStyles.linkedSectionTitle}>Электронное подписание</h4>
        <button
          type="button"
          className={styles.refreshBtn}
          title="Обновить события подписания"
          aria-label="Обновить события подписания"
          disabled={busy}
          onClick={() => void load()}
        >
          <ArrowPathIcon
            className={`${styles.refreshIcon} ${busy ? styles.refreshSpinning : ''}`}
            aria-hidden
          />
        </button>
      </div>

      {sessions === null ? (
        <p className={styles.hint}>Загрузка событий подписания…</p>
      ) : sessions.length === 0 ? (
        <p className={styles.hint}>
          Договор ещё не отправлялся на электронное подписание. Отправить можно кнопкой «Подписать
          дистанционно» на странице договора.
        </p>
      ) : (
        <ul className={styles.list}>
          {sessions.map((s) => (
            <li key={s.id} className={styles.session}>
              <div className={styles.sessionHead}>
                <span className={statusClassName(s.status)}>
                  {remoteSigningStatusLabel(s.status)}
                </span>
                {s.documents.length > 0 ? (
                  <span className={styles.hint}>документов: {s.documents.length}</span>
                ) : null}
              </div>
              <ul className={styles.events}>
                {sessionEvents(s).map((event, idx) => (
                  <li
                    key={`${s.id}-${idx}`}
                    className={
                      event.tone === 'signed'
                        ? styles.eventToneSigned
                        : event.tone === 'rejected'
                          ? styles.eventToneRejected
                          : undefined
                    }
                  >
                    {event.text}
                    {event.date ? (
                      <span className={styles.eventDate}> · {formatDateTime(event.date)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {s.documents.length > 0 ? (
                <div className={styles.docs}>
                  <span className={styles.docsTitle}>Документы{signedDocLabel(s.status)}:</span>
                  <ul className={styles.docsList}>
                    {s.documents.map((doc) => (
                      <li key={`${s.id}-${doc.tabId}-${doc.fileName}`}>
                        {doc.fileUrl ? (
                          <a
                            className={styles.docLink}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={doc.fileName}
                          >
                            {doc.label || doc.fileName}
                          </a>
                        ) : (
                          <span>{doc.label || doc.fileName}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
