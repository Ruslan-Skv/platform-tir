'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';

import { useCallback, useEffect, useState } from 'react';

import {
  type ContractDocumentSigningSessionListItem,
  finalizePackageSigningSession,
  listPackageSigningSessions,
  remoteSigningStatusLabel,
} from '@/shared/api/contract-documents/admin-contract-document-signing';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import crmDetailStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerDetailModal.module.css';

import { remoteSigningStageLabel, remoteSigningStageOf } from '../../share/remoteSigningStage';
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
  const [finalizingId, setFinalizingId] = useState<string | null>(null);

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

  /** Скачивание единого подписанного комплекта; для легаси-сессий — генерация по кнопке. */
  const openSignedPackage = useCallback(
    async (session: ContractDocumentSigningSessionListItem) => {
      if (session.signedPackageUrl) {
        window.open(publicUploadUrl(session.signedPackageUrl), '_blank', 'noopener,noreferrer');
        return;
      }
      setFinalizingId(session.id);
      try {
        const updated = await finalizePackageSigningSession(packageId, session.id);
        setSessions((prev) => (prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev));
        if (updated.signedPackageUrl) {
          window.open(publicUploadUrl(updated.signedPackageUrl), '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : 'Не удалось сформировать подписанный комплект'
        );
      } finally {
        setFinalizingId(null);
      }
    },
    [packageId, onError]
  );

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
          Документы ещё не отправлялись на электронное подписание (договор, акты, Д/с). Отправить
          можно кнопкой «Подписать дистанционно» на странице договора.
        </p>
      ) : (
        <ul className={styles.list}>
          {sessions.map((s) => {
            const stageInfo = remoteSigningStageOf(s.documents.map((d) => d.tabId));
            return (
              <li key={s.id} className={styles.session}>
                <div className={styles.sessionHead}>
                  <span className={statusClassName(s.status)}>
                    {remoteSigningStatusLabel(s.status)}
                  </span>
                  <span className={styles.hint}>
                    {remoteSigningStageLabel(stageInfo.stage, stageInfo.stageTab)}
                  </span>
                  {s.documents.length > 0 ? (
                    <span className={styles.hint}>документов: {s.documents.length}</span>
                  ) : null}
                  {s.status === 'SIGNED' ? (
                    <button
                      type="button"
                      className={styles.packageBtn}
                      disabled={finalizingId === s.id}
                      title="Единый PDF: документы с отметками ЭП и протокол подписания"
                      onClick={() => void openSignedPackage(s)}
                    >
                      {finalizingId === s.id
                        ? 'Формируем комплект…'
                        : s.signedPackageUrl
                          ? 'Подписанный комплект (PDF)'
                          : 'Сформировать подписанный комплект'}
                    </button>
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
                          {doc.signedFileUrl ? (
                            <>
                              <a
                                className={styles.docLink}
                                href={publicUploadUrl(doc.signedFileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                title={doc.fileName}
                              >
                                {doc.label || doc.fileName}
                              </a>{' '}
                              <span className={styles.docNote}>с отметкой ЭП</span>{' '}
                              <a
                                className={styles.docLink}
                                href={publicUploadUrl(doc.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                title={doc.fileName}
                              >
                                (отправленный файл)
                              </a>
                            </>
                          ) : doc.fileUrl ? (
                            <a
                              className={styles.docLink}
                              href={publicUploadUrl(doc.fileUrl)}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
