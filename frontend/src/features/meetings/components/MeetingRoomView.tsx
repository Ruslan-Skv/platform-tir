'use client';

import { useEffect, useRef, useState } from 'react';

import type { MeetingChatMessage, MeetingUser } from '@/shared/api/admin-meetings';

import type { RoomParticipant } from '../hooks/useMeetingRoom';
import styles from './MeetingsRoom.module.css';
import { VideoTile, formatParticipantName } from './VideoTile';

export interface MeetingRoomModel {
  title: string;
  me: MeetingUser | null;
  localStream: MediaStream | null;
  participants: RoomParticipant[];
  chat: MeetingChatMessage[];
  micOn: boolean;
  camOn: boolean;
  screenOn: boolean;
  recording: boolean;
  lowQuality: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onToggleRecording: () => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
  registerTile: (key: string, el: HTMLVideoElement | null) => void;
}

export function MeetingRoomView(model: MeetingRoomModel) {
  const total = model.participants.length + 1;
  const gridClass = total <= 1 ? styles.grid1 : total === 2 ? styles.grid2 : styles.grid3plus;

  return (
    <div className={styles.room}>
      <div className={styles.roomHeader}>
        <div>
          <h2 className={styles.roomTitle}>{model.title}</h2>
          <p className={styles.roomMeta}>Участников: {total}</p>
        </div>
        {model.lowQuality && (
          <div className={styles.qualityHint}>
            Много участников — качество видео снижено. Рекомендуем выключить камеры.
          </div>
        )}
      </div>

      <div className={styles.roomBody}>
        <div className={`${styles.grid} ${gridClass}`}>
          {model.me && (
            <VideoTile
              label={formatParticipantName(model.me)}
              stream={model.localStream}
              isSelf
              mirrored
              mic={model.micOn}
              camera={model.camOn}
              screen={model.screenOn}
              registerEl={(el) => model.registerTile('me', el)}
            />
          )}
          {model.participants.map((participant) => (
            <VideoTile
              key={participant.user.id}
              label={formatParticipantName(participant.user)}
              stream={participant.stream}
              mic={participant.mic}
              camera={participant.camera}
              screen={participant.screen}
              connection={participant.connection}
              registerEl={(el) => model.registerTile(participant.user.id, el)}
            />
          ))}
        </div>

        <ChatPanel chat={model.chat} meId={model.me?.id} onSend={model.onSendChat} />
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.toolButton} ${model.micOn ? '' : styles.toolButtonDanger}`}
          onClick={model.onToggleMic}
        >
          {model.micOn ? '🎙 Микрофон' : '🔇 Микрофон выключен'}
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${model.camOn ? styles.toolButtonActive : ''}`}
          onClick={model.onToggleCam}
        >
          {model.camOn ? '🎥 Камера' : '🎥 Камера выключена'}
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${model.screenOn ? styles.toolButtonActive : ''}`}
          onClick={model.onToggleScreen}
        >
          🖥 {model.screenOn ? 'Закончить показ' : 'Показать экран'}
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${model.recording ? styles.toolButtonRec : ''}`}
          onClick={model.onToggleRecording}
        >
          {model.recording ? (
            <>
              <span className={styles.recDot} /> Остановить запись
            </>
          ) : (
            '⏺ Записать'
          )}
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${styles.toolButtonDanger}`}
          onClick={model.onLeave}
        >
          Покинуть
        </button>
      </div>
    </div>
  );
}

function ChatPanel({
  chat,
  meId,
  onSend,
}: {
  chat: MeetingChatMessage[];
  meId?: string;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.length]);

  return (
    <aside className={styles.sidePanel}>
      <h3 className={styles.sidePanelTitle}>Чат собрания</h3>
      <div className={styles.chatList} ref={listRef}>
        {chat.length === 0 && <span className={styles.chatEmpty}>Сообщений пока нет</span>}
        {chat.map((message) => (
          <div key={`${message.at}-${message.userId}`} className={styles.chatMessage}>
            <div className={styles.chatMeta}>
              {message.userName}
              {message.userId === meId ? ' (вы)' : ''} ·{' '}
              {new Date(message.at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>{message.text}</div>
          </div>
        ))}
      </div>
      <form
        className={styles.chatForm}
        onSubmit={(event) => {
          event.preventDefault();
          onSend(text);
          setText('');
        }}
      >
        <input
          className={styles.chatInput}
          value={text}
          maxLength={500}
          placeholder="Сообщение…"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className={styles.toolButton} disabled={!text.trim()}>
          →
        </button>
      </form>
    </aside>
  );
}
