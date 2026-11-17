'use client';

import { formatParticipantName } from '@/features/meetings';
import { MeetingPrejoin, MeetingRoomView } from '@/features/meetings';
import type { Meeting } from '@/shared/api/admin-meetings';

import { CreateMeetingModal } from './CreateMeetingModal';
import styles from './MeetingsPage.module.css';
import type { MeetingsPageModel } from './hooks/useMeetingsPage';

function formatWhen(meeting: Meeting): string {
  if (!meeting.scheduledAt) return 'Начало сразу после входа';
  return new Date(meeting.scheduledAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS: Record<Meeting['status'], string> = {
  SCHEDULED: 'Запланировано',
  ACTIVE: 'Идёт',
  ENDED: 'Завершено',
  CANCELLED: 'Отменено',
};

export function MeetingsPageView({ model }: { model: MeetingsPageModel }) {
  const room = model.room;

  // Экран входа / комната / итог — пока открыт joinId
  if (model.joinId) {
    if (room.phase === 'in-room' && room.meeting) {
      return (
        <div className={styles.page}>
          <MeetingRoomView
            title={room.meeting.title}
            me={room.me}
            localStream={room.localStream}
            participants={room.participants}
            chat={room.chat}
            micOn={room.micOn}
            camOn={room.camOn}
            screenOn={room.screenOn}
            recording={room.recording}
            lowQuality={room.lowQuality}
            onToggleMic={room.toggleMic}
            onToggleCam={() => void room.toggleCam()}
            onToggleScreen={() => void room.toggleScreen()}
            onToggleRecording={() => void room.toggleRecording()}
            onSendChat={room.sendChat}
            onLeave={room.leave}
            registerTile={room.registerTile}
          />
        </div>
      );
    }

    if (room.phase === 'ended') {
      return (
        <div className={styles.page}>
          <div className={styles.endedBlock}>
            <h2 className={styles.endedTitle}>
              {room.endedReason === 'cancelled'
                ? 'Собрание отменено'
                : room.endedReason === 'kicked'
                  ? 'Подключение из другого окна'
                  : 'Вы покинули собрание'}
            </h2>
            <p className={styles.endedText}>
              {room.endedReason === 'kicked'
                ? 'Вы вошли в это собрание в другой вкладке — текущее подключение закрыто.'
                : 'Можно вернуться, пока собрание не завершено.'}
            </p>
            <button type="button" className={styles.ghostButton} onClick={model.closeJoin}>
              К списку собраний
            </button>
          </div>
        </div>
      );
    }

    // idle / connecting / error → экран входа
    return (
      <div className={styles.page}>
        <MeetingPrejoin
          title={room.meeting?.title ?? 'Онлайн-собрание'}
          connecting={room.phase === 'connecting'}
          error={room.error}
          onEnter={(withVideo) => void room.enter(withVideo)}
          onCancel={model.closeJoin}
        />
      </div>
    );
  }

  // Основной список
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Онлайн-собрания</h1>
          <p className={styles.subtitle}>
            Видеоконференции сотрудников админки: видео, аудио, демонстрация экрана, чат и локальная
            запись. Комфортно до 6 участников, максимум — 8.
          </p>
        </div>
        <button type="button" className={styles.createButton} onClick={model.openCreate}>
          + Собрание
        </button>
      </div>

      {model.errorMessage && (
        <div className={styles.error}>
          <span>{model.errorMessage}</span>
          <button type="button" onClick={() => model.setErrorMessage(null)}>
            ×
          </button>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${model.scope === 'upcoming' ? styles.tabActive : ''}`}
          onClick={() => model.setScope('upcoming')}
        >
          Предстоящие
        </button>
        <button
          type="button"
          className={`${styles.tab} ${model.scope === 'past' ? styles.tabActive : ''}`}
          onClick={() => model.setScope('past')}
        >
          Прошедшие
        </button>
      </div>

      {model.loading ? (
        <div className={styles.loading}>Загрузка…</div>
      ) : model.meetings.length === 0 ? (
        <div className={styles.empty}>
          {model.scope === 'upcoming'
            ? 'Запланированных собраний нет — создайте первое.'
            : 'История пуста.'}
        </div>
      ) : (
        <div className={styles.list}>
          {model.meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              currentUserId={model.currentUserId}
              busy={model.busy}
              onJoin={() => void model.openJoin(meeting.id)}
              onCancel={() => void model.submitCancel(meeting.id)}
            />
          ))}
        </div>
      )}

      <CreateMeetingModal
        open={model.createOpen}
        busy={model.busy}
        title={model.createTitle}
        description={model.createDescription}
        date={model.createDate}
        time={model.createTime}
        participantIds={model.createParticipantIds}
        users={model.users}
        onTitleChange={model.setCreateTitle}
        onDescriptionChange={model.setCreateDescription}
        onDateChange={model.setCreateDate}
        onTimeChange={model.setCreateTime}
        onParticipantIdsChange={model.setCreateParticipantIds}
        onClose={() => model.setCreateOpen(false)}
        onSubmit={() => void model.submitCreate()}
      />
    </div>
  );
}

function MeetingCard({
  meeting,
  currentUserId,
  busy,
  onJoin,
  onCancel,
}: {
  meeting: Meeting;
  currentUserId: string | null;
  busy: boolean;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const canJoin = meeting.status === 'SCHEDULED' || meeting.status === 'ACTIVE';
  const isAuthor = Boolean(currentUserId) && meeting.createdById === currentUserId;

  return (
    <article className={`${styles.card} ${meeting.status === 'ACTIVE' ? styles.cardActive : ''}`}>
      <div className={styles.cardMain}>
        <h3 className={styles.cardTitle}>
          {meeting.title}
          <span
            className={`${styles.statusPill} ${
              meeting.status === 'ACTIVE'
                ? styles.statusActive
                : meeting.status === 'CANCELLED'
                  ? styles.statusCancelled
                  : ''
            }`}
          >
            {STATUS_LABELS[meeting.status]}
          </span>
        </h3>
        <p className={styles.cardMeta}>
          {formatWhen(meeting)} · автор {formatParticipantName(meeting.createdBy)}
          {meeting.description ? ` · ${meeting.description}` : ''}
        </p>
        <p className={styles.cardPeople}>
          Участники: {meeting.participants.map((p) => formatParticipantName(p.user)).join(', ')}
        </p>
      </div>
      <div className={styles.cardActions}>
        {canJoin && (
          <button type="button" className={styles.joinButton} disabled={busy} onClick={onJoin}>
            {meeting.status === 'ACTIVE' ? 'Войти' : 'Войти в комнату'}
          </button>
        )}
        {meeting.status === 'SCHEDULED' && isAuthor && (
          <button type="button" className={styles.dangerButton} disabled={busy} onClick={onCancel}>
            Отменить
          </button>
        )}
      </div>
    </article>
  );
}
