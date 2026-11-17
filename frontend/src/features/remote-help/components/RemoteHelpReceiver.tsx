'use client';

/**
 * Глобальный приёмник удалённой помощи (монтируется в админ-лайауте).
 * Сотруднику — модалка приглашения, баннер активного сеанса и кнопка
 * «Запросить помощь»; суперадмину — тост о входящем запросе.
 */
import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/Button/Button';
import { Modal } from '@/shared/ui/Modal/Modal';

import { useRemoteHelpReceiver } from '../hooks/useRemoteHelpReceiver';
import styles from './RemoteHelpReceiver.module.css';

function displayName(
  user: { firstName: string | null; lastName: string | null; email: string } | null | undefined
): string {
  if (!user) return '';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.email;
}

export function RemoteHelpReceiver() {
  const model = useRemoteHelpReceiver();
  const { user } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Тост о запросе помощи гасим сами через минуту
  useEffect(() => {
    if (!model.helperRequest) return;
    const timer = window.setTimeout(() => model.dismissHelperRequest(), 60_000);
    return () => window.clearTimeout(timer);
  }, [model, model.helperRequest]);

  return (
    <>
      {model.error && (
        <div className={styles.errorToast} role="alert">
          <span>{model.error}</span>
          <button type="button" onClick={model.clearError} aria-label="Закрыть">
            ×
          </button>
        </div>
      )}

      {!isSuperAdmin && !model.activeSession && (
        <button
          type="button"
          className={styles.requestButton}
          onClick={model.requestHelp}
          disabled={model.requestSending || model.requestPending}
          title={
            model.requestPending
              ? 'Запрос отправлен — ждём ответа суперадмина'
              : 'Попросить суперадмина подключиться к вашему экрану'
          }
        >
          <span className={styles.requestIcon} aria-hidden>
            🎧
          </span>
          <span className={styles.requestLabel}>
            {model.requestPending ? 'Ждём суперадмина…' : 'Запросить помощь'}
          </span>
        </button>
      )}

      {model.activeSession && (
        <div className={styles.activeBanner} data-remote-help-banner>
          <span className={styles.pulseDot} aria-hidden />
          <span>
            Идёт сеанс помощи
            {model.activeSession.admin ? ` — ${displayName(model.activeSession.admin)}` : ''}. Экран
            транслируется.
          </span>
          <Button variant="secondary" size="sm" onClick={model.end}>
            Завершить
          </Button>
        </div>
      )}

      {isSuperAdmin && model.helperRequest && (
        <div className={styles.helperToast}>
          <span>
            {displayName(model.helperRequest.user)} запрашивает помощь в работе с приложением
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              model.dismissHelperRequest();
              router.push('/admin/remote-help');
            }}
          >
            Открыть
          </Button>
          <button
            type="button"
            className={styles.helperToastClose}
            onClick={model.dismissHelperRequest}
            aria-label="Скрыть"
          >
            ×
          </button>
        </div>
      )}

      <Modal
        isOpen={Boolean(model.invite)}
        onClose={model.decline}
        title="Запрос удалённой помощи"
        size="sm"
        showCloseButton={false}
      >
        <div className={styles.inviteBody}>
          <p>
            <strong>{displayName(model.invite?.admin)}</strong> просит разрешение подключиться к
            вашему экрану, чтобы помочь в работе с приложением.
          </p>
          <p className={styles.hint}>
            После нажатия «Разрешить» браузер предложит выбрать, что транслировать — поделитесь
            вкладкой или окном приложения. Суперадмин увидит экран и сможет нажимать и вводить текст
            за вас внутри приложения. Управление работает только в окне приложения, сеанс можно
            завершить в любой момент.
          </p>
          <div className={styles.inviteActions}>
            <Button variant="secondary" onClick={model.decline} disabled={model.accepting}>
              Отклонить
            </Button>
            <Button variant="primary" onClick={model.accept} disabled={model.accepting}>
              {model.accepting ? 'Подключение…' : 'Разрешить'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
