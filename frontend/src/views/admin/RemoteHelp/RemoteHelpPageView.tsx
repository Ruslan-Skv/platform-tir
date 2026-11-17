'use client';

import { useEffect, useState } from 'react';

import type { RemoteHelpSession, RemoteHelpUser } from '@/shared/api/admin-remote-help';
import { getRoleLabel } from '@/shared/config/admin-roles';
import { Button } from '@/shared/ui/Button/Button';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './RemoteHelpPage.module.css';
import type { RemoteHelpPageModel } from './hooks/useRemoteHelpPage';

type RemoteHelpPageViewProps = {
  model: RemoteHelpPageModel;
};

const STATUS_LABELS: Record<RemoteHelpSession['status'], string> = {
  REQUESTED: 'Запрос сотрудника',
  PENDING: 'Ждём согласия',
  ACTIVE: 'Идёт сеанс',
  ENDED: 'Завершён',
  DECLINED: 'Отклонён',
  CANCELLED: 'Отменён',
  EXPIRED: 'Истёк',
};

const END_REASON_LABELS: Record<string, string> = {
  manual: 'вручную',
  'share-stopped': 'сотрудник прекратил показ',
  disconnect: 'обрыв связи',
  timeout: 'истёк срок ожидания',
  declined: 'отказ',
  cancelled: 'отмена',
};

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function displayName(user: RemoteHelpUser | null | undefined): string {
  if (!user) return '—';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.email;
}

function initials(user: RemoteHelpUser): string {
  const first = user.firstName?.[0] ?? user.email[0] ?? '?';
  const last = user.lastName?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

function formatDuration(fromIso: string | null, toIso: string | null): string {
  if (!fromIso) return '—';
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.round((to - from) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Тикающий таймер длительности активного сеанса. */
function SessionTimer({ session }: { session: RemoteHelpSession }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span>{formatDuration(session.startedAt, session.endedAt)}</span>;
}

export function RemoteHelpPageView({ model }: RemoteHelpPageViewProps) {
  const {
    pending,
    history,
    onlineAdmins,
    viewerSession,
    stream,
    connectionState,
    controlEnabled,
    busyUserId,
    error,
    videoRef,
    containerRef,
    invite,
    claim,
    cancel,
    endSession,
    toggleControl,
    toggleFullscreen,
    refresh,
    clearError,
  } = model;

  const requests = pending?.requests ?? [];
  const invites = pending?.invites ?? [];

  const historyColumns = [
    {
      key: 'user',
      title: 'Сотрудник',
      render: (item: RemoteHelpSession) => displayName(item.user),
    },
    {
      key: 'admin',
      title: 'Суперадмин',
      render: (item: RemoteHelpSession) => displayName(item.admin),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (item: RemoteHelpSession) => STATUS_LABELS[item.status],
    },
    {
      key: 'createdAt',
      title: 'Создан',
      render: (item: RemoteHelpSession) => timeFormatter.format(new Date(item.createdAt)),
    },
    {
      key: 'duration',
      title: 'Длительность',
      render: (item: RemoteHelpSession) =>
        item.status === 'ACTIVE' ? (
          <SessionTimer session={item} />
        ) : (
          formatDuration(item.startedAt, item.endedAt)
        ),
    },
    {
      key: 'endReason',
      title: 'Завершение',
      render: (item: RemoteHelpSession) =>
        item.endReason ? (END_REASON_LABELS[item.endReason] ?? item.endReason) : '—',
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Удалённая помощь</h1>
          <p className={styles.subtitle}>
            Подключение к экрану сотрудника: он подтверждает доступ, вы видите его экран и можете
            нажимать и вводить текст в окне приложения.
          </p>
        </div>
        <AdminListRefreshButton onClick={refresh} />
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Закрыть">
            ×
          </button>
        </div>
      )}

      <div className={styles.columns}>
        <aside className={styles.side}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Запросы помощи ({requests.length})</h2>
            {requests.length === 0 && <p className={styles.empty}>Никто не запрашивал помощь</p>}
            {requests.map((session) => (
              <div key={session.id} className={styles.row}>
                <span className={styles.avatar} aria-hidden>
                  {initials(session.user)}
                </span>
                <div className={styles.rowMain}>
                  <span className={styles.rowName}>{displayName(session.user)}</span>
                  <span className={styles.rowMeta}>
                    {getRoleLabel(session.user.role)} ·{' '}
                    {timeFormatter.format(new Date(session.createdAt))}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => claim(session.id)}
                  disabled={busyUserId === session.id}
                >
                  Принять
                </Button>
              </div>
            ))}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Онлайн-сотрудники ({onlineAdmins.length})</h2>
            {onlineAdmins.length === 0 && (
              <p className={styles.empty}>Сейчас в админке никого нет</p>
            )}
            {onlineAdmins.map((user) => (
              <div key={user.id} className={styles.row}>
                <span className={styles.avatar} aria-hidden>
                  {`${(user.firstName || user.email)[0] ?? '?'}${user.lastName?.[0] ?? ''}`.toUpperCase()}
                </span>
                <div className={styles.rowMain}>
                  <span className={styles.rowName}>
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                  </span>
                  <span className={styles.rowMeta}>{getRoleLabel(user.role)}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => invite(user.id)}
                  disabled={busyUserId === user.id}
                >
                  Подключиться
                </Button>
              </div>
            ))}
          </section>

          {invites.length > 0 && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Ждём согласия ({invites.length})</h2>
              {invites.map((session) => (
                <div key={session.id} className={styles.row}>
                  <span className={styles.avatar} aria-hidden>
                    {initials(session.user)}
                  </span>
                  <div className={styles.rowMain}>
                    <span className={styles.rowName}>{displayName(session.user)}</span>
                    <span className={styles.rowMeta}>приглашение отправлено</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancel(session.id)}
                    disabled={busyUserId === session.id}
                  >
                    Отменить
                  </Button>
                </div>
              ))}
            </section>
          )}
        </aside>

        <div className={styles.main}>
          <section className={styles.viewerCard}>
            <div className={styles.viewerToolbar}>
              <div className={styles.viewerHeading}>
                {viewerSession ? (
                  <>
                    <span className={styles.liveDot} aria-hidden />
                    <strong>Сеанс с {displayName(viewerSession.user)}</strong>
                    <span className={styles.viewerDuration}>
                      <SessionTimer session={viewerSession} />
                    </span>
                  </>
                ) : (
                  <strong>Экран сотрудника</strong>
                )}
              </div>
              {viewerSession && (
                <div className={styles.viewerActions}>
                  <Button
                    variant={controlEnabled ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={toggleControl}
                  >
                    {controlEnabled ? '🖱 Управление включено' : '🖱 Включить управление'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                    На весь экран
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => endSession(viewerSession.id)}>
                    Завершить сеанс
                  </Button>
                </div>
              )}
            </div>

            <div
              ref={containerRef}
              className={`${styles.viewerContainer}${controlEnabled ? ` ${styles.viewerContainerActive}` : ''}`}
              tabIndex={0}
            >
              <video ref={videoRef} autoPlay playsInline className={styles.video} />
              {!viewerSession && (
                <div className={styles.viewerPlaceholder}>
                  <span aria-hidden>🖥️</span>
                  <p>
                    Выберите онлайн-сотрудника слева и нажмите «Подключиться». После его согласия
                    здесь появится трансляция экрана.
                  </p>
                </div>
              )}
              {viewerSession && !stream && (
                <div className={styles.viewerPlaceholder}>
                  <span className={styles.spinner} aria-hidden />
                  <p>
                    {connectionState === 'connected'
                      ? 'Получаем видеопоток…'
                      : 'Ожидаем начало трансляции — сотрудник должен разрешить доступ к экрану'}
                  </p>
                </div>
              )}
            </div>

            <p className={styles.viewerHint}>
              Управление работает внутри окна приложения: кликайте и печатайте прямо по видео, когда
              включено управление. Красная точка на экране сотрудника подсказывает, куда вы
              указываете. Файловые диалоги браузера недоступны для удалённого ввода.
            </p>
          </section>

          <section className={styles.historyPanel}>
            <h2 className={styles.panelTitle}>История сеансов</h2>
            <DataTable
              data={history}
              columns={historyColumns}
              keyExtractor={(item) => item.id}
              defaultSortBy="createdAt"
              defaultSortOrder="desc"
              emptyMessage="Сеансов пока не было"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
