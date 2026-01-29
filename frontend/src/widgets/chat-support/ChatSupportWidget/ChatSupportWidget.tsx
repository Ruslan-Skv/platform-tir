'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUserAuth } from '@/features/auth';

import styles from './ChatSupportWidget.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Conversation {
  id: string;
  userId: string;
  assignedToId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: { content: string; createdAt: string }[];
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
}

export function ChatSupportWidget() {
  const { isAuthenticated, getAuthHeaders, user } = useUserAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/support/conversations`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAuthHeaders]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`${API_URL}/support/conversations/${conversationId}/messages`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMessages(false);
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    if (open && isAuthenticated) {
      fetchConversations();
    }
  }, [open, isAuthenticated, fetchConversations]);

  useEffect(() => {
    if (currentConversation?.id) {
      fetchMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation?.id, fetchMessages]);

  const startConversation = async () => {
    try {
      const res = await fetch(`${API_URL}/support/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations((prev) => [conv, ...prev]);
        setCurrentConversation(conv);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !currentConversation || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(
        `${API_URL}/support/conversations/${currentConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ content: text }),
        }
      );
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      } else {
        setInput(text);
      }
    } catch (e) {
      setInput(text);
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return (
      d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    );
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-label="Чат поддержки"
      >
        💬
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            {currentConversation ? (
              <>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={() => setCurrentConversation(null)}
                >
                  ← Назад
                </button>
                <span>Чат с поддержкой</span>
              </>
            ) : (
              <span>Чат поддержки</span>
            )}
            <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          {!currentConversation ? (
            <>
              {loading ? (
                <div className={styles.loading}>Загрузка диалогов...</div>
              ) : (
                <>
                  <button type="button" className={styles.startNew} onClick={startConversation}>
                    Начать новый диалог
                  </button>
                  <div className={styles.conversationList}>
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={styles.conversationItem}
                        onClick={() => setCurrentConversation(c)}
                      >
                        Диалог #{c.id.slice(-6)}
                        {c.messages?.[0] && (
                          <div className={styles.lastMessage}>{c.messages[0].content}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.messagesArea}>
              {loadingMessages ? (
                <div className={styles.loading}>Загрузка сообщений...</div>
              ) : messages.length === 0 ? (
                <div className={styles.empty}>
                  Напишите сообщение — специалист поддержки ответит вам.
                </div>
              ) : (
                <div className={styles.messagesList}>
                  {messages.map((m) => {
                    const isMine = m.senderId === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`${styles.message} ${isMine ? styles.mine : styles.theirs}`}
                      >
                        <div>{m.content}</div>
                        <div className={styles.messageMeta}>
                          {!isMine && m.sender.firstName && `${m.sender.firstName} · `}
                          {formatDate(m.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={styles.inputRow}>
                <input
                  type="text"
                  placeholder="Введите сообщение..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <button type="button" onClick={sendMessage} disabled={sending || !input.trim()}>
                  Отправить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
