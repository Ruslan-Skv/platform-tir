'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  type PublicSigningSession,
  getPublicSigningSession,
  markPublicSigningViewed,
  rejectPublicSigningSession,
  remoteSigningStatusLabel,
  signPublicSigningSession,
} from '@/shared/api/admin-contract-document-signing';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './ContractDocumentSignPage.module.css';

function statusClassName(status: PublicSigningSession['status']): string {
  if (status === 'SIGNED') return `${styles.statusBadge} ${styles.statusDone}`;
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
    return `${styles.statusBadge} ${styles.statusRejected}`;
  }
  return styles.statusBadge;
}

export function ContractDocumentSignPageView() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [session, setSession] = useState<PublicSigningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [signedName, setSignedName] = useState('');
  const [consent, setConsent] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Ссылка недействительна');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicSigningSession(token);
      setSession(data);
      if (data.customerName) {
        setSignedName((prev) => (prev.trim() ? prev : data.customerName || ''));
      }
      if (data.canSign) {
        void markPublicSigningViewed(token)
          .then(setSession)
          .catch(() => undefined);
      }
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : 'Не удалось открыть документы');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const expiresLabel = useMemo(() => {
    if (!session?.expiresAt) return null;
    try {
      return new Date(session.expiresAt).toLocaleString('ru-RU');
    } catch {
      return null;
    }
  }, [session?.expiresAt]);

  const onSign = async () => {
    if (!token || !session?.canSign) return;
    setBusy(true);
    setFormError(null);
    try {
      const next = await signPublicSigningSession(token, {
        otpCode: otpCode.trim(),
        signedName: signedName.trim(),
        consent,
      });
      setSession(next);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось подписать');
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!token || !session?.canSign) return;
    setBusy(true);
    setFormError(null);
    try {
      const next = await rejectPublicSigningSession(token, rejectReason.trim() || undefined);
      setSession(next);
      setShowReject(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось отклонить');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка документов…</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1 className={styles.title}>Подписание документов</h1>
          <p>{error ?? 'Ссылка не найдена'}</p>
          <p className={styles.hint}>
            Ссылка могла истечь, быть отозвана или указана неверно. Обратитесь к менеджеру.
          </p>
          <Link href="/" className={styles.link}>
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel = remoteSigningStatusLabel(session.status) || session.status;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Подписание документов</h1>
      <p className={styles.subtitle}>
        {session.contractTitle?.trim() || 'Пакет договорных документов'}
        {session.customerName ? ` · ${session.customerName}` : ''}
      </p>
      <span className={statusClassName(session.status)}>{statusLabel}</span>
      {expiresLabel && session.canSign ? (
        <p className={styles.hint}>Срок действия ссылки: до {expiresLabel}</p>
      ) : null}
      {session.managerNote ? <p className={styles.note}>{session.managerNote}</p> : null}

      <ul className={styles.docs} aria-label="Документы">
        {session.documents.map((doc) => (
          <li key={`${doc.tabId}-${doc.fileName}`}>
            <a
              className={styles.docLink}
              href={publicUploadUrl(doc.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{doc.label}</span>
              <span className={styles.docMeta}>PDF</span>
            </a>
          </li>
        ))}
      </ul>

      {session.status === 'SIGNED' ? (
        <div className={styles.successBox} role="status">
          Документы подписаны
          {session.signedName ? ` (${session.signedName})` : ''}.
          {session.signedAt ? ` ${new Date(session.signedAt).toLocaleString('ru-RU')}` : null}
        </div>
      ) : null}

      {session.status === 'REJECTED' ? (
        <div className={`${styles.statusBadge} ${styles.statusRejected}`} role="status">
          Документы отклонены
          {session.rejectedAt ? ` · ${new Date(session.rejectedAt).toLocaleString('ru-RU')}` : null}
        </div>
      ) : null}

      {session.canSign ? (
        <>
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="sign-fio">ФИО подписанта</label>
              <input
                id="sign-fio"
                type="text"
                autoComplete="name"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Как в паспорте"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="sign-otp">Код подтверждения</label>
              <input
                id="sign-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 цифр из сообщения"
              />
            </div>
            <label className={styles.consent}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Подтверждаю, что ознакомился(ась) с документами по ссылке и согласен(на) подписать
                их в представленном виде.
              </span>
            </label>
            {formError ? <p className={styles.formError}>{formError}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy || !consent || signedName.trim().length < 2 || otpCode.length !== 6}
                onClick={() => void onSign()}
              >
                {busy ? 'Подписание…' : 'Подписать'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={() => setShowReject((v) => !v)}
              >
                Отклонить
              </button>
            </div>
          </div>

          {showReject ? (
            <div className={styles.rejectBox}>
              <div className={styles.field}>
                <label htmlFor="sign-reject">Причина отклонения (необязательно)</label>
                <textarea
                  id="sign-reject"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy}
                  onClick={() => void onReject()}
                >
                  Подтвердить отклонение
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
