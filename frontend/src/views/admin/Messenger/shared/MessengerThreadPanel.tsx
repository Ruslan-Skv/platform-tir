'use client';

import type { Socket } from 'socket.io-client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type MessengerMessage,
  getKanbanCardThread,
  listMessengerMessages,
  markMessengerRead,
  sendMessengerMessage,
} from '@/shared/api/messenger/admin-messenger';
import {
  connectMessengerSocket,
  joinMessengerConversation,
  leaveMessengerConversation,
} from '@/shared/api/messenger/messenger-socket';

import styles from '../MessengerPage.module.css';
import { MessengerEmojiPicker } from './MessengerEmojiPicker';
import { insertTextAtCursor } from './messenger-composer.utils';
import { formatMessageTime, formatMessengerUser, messengerUserInitials } from './messenger.utils';

type Props = {
  cardId: string;
  enabled: boolean;
};

export function MessengerThreadPanel({ cardId, enabled }: Props) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const thread = await getKanbanCardThread(cardId);
        if (cancelled) return;
        setConversationId(thread.id);
        const { items } = await listMessengerMessages(thread.id, { limit: 80 });
        if (cancelled) return;
        setMessages(items);
        await markMessengerRead(thread.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Не удалось открыть чат');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardId, enabled]);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    const socket = connectMessengerSocket({
      onMessageNew: (message) => {
        if (message.conversationId !== conversationIdRef.current) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        void markMessengerRead(message.conversationId);
      },
    });
    socketRef.current = socket;
    joinMessengerConversation(socket, conversationId);

    return () => {
      leaveMessengerConversation(socket, conversationId);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, enabled]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversationId || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await sendMessengerMessage(conversationId, text);
      setInput('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  }, [conversationId, input, sending]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  if (!enabled) return null;

  return (
    <div className={styles.threadPanel}>
      {error ? <p data-modal-form-error>{error}</p> : null}
      <div className={styles.threadMessages}>
        {loading ? <p className={styles.emptyList}>Загрузка чата…</p> : null}
        {!loading && messages.length === 0 ? (
          <p className={styles.emptyList}>Напишите первое сообщение по задаче</p>
        ) : null}
        {messages.map((m) => {
          const mine = m.authorId === currentUserId;
          return (
            <div key={m.id} className={styles.message}>
              <span className={styles.avatar} aria-hidden>
                {messengerUserInitials(m.author)}
              </span>
              <div className={styles.messageBody}>
                <div className={styles.messageMeta}>
                  <span className={styles.messageAuthor}>
                    {mine ? 'Вы' : formatMessengerUser(m.author)}
                  </span>
                  <span className={styles.messageTime}>{formatMessageTime(m.createdAt)}</span>
                </div>
                <p className={styles.messageText}>{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className={styles.composer} onSubmit={onSubmit}>
        <div className={styles.composerField}>
          <MessengerEmojiPicker
            disabled={sending || !conversationId}
            onPick={(emoji) => insertTextAtCursor(inputRef.current, input, emoji, setInput)}
          />
          <textarea
            ref={inputRef}
            className={styles.composerInput}
            rows={2}
            value={input}
            disabled={sending || !conversationId}
            placeholder="Сообщение по задаче…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
        </div>
        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={sending || !input.trim() || !conversationId}
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
