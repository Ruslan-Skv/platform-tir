'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './SupportChatPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Conversation {
  id: string;
  userId: string;
  assignedToId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  assignedTo: { id: string; firstName: string | null; lastName: string | null } | null;
  messages: { content: string; createdAt: string }[];
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

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  CLOSED: 'Закрыт',
};

export function SupportChatPage() {
  const { getAuthHeaders, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ asSupport: 'true' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_URL}/support/conversations?${params}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        setSelected((prev) =>
          prev && !list.find((c: Conversation) => c.id === prev.id) ? null : prev
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, statusFilter]);

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
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selected?.id) {
      fetchMessages(selected.id);
    } else {
      setMessages([]);
    }
  }, [selected?.id, fetchMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`${API_URL}/support/conversations/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content: text }),
      });
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
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const userName = (c: Conversation) =>
    [c.user.firstName, c.user.lastName].filter(Boolean).join(' ') || c.user.email;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Чат поддержки</h1>
        <p className={styles.subtitle}>
          Диалоги пользователей с поддержкой. Выберите диалог и ответьте клиенту.
        </p>
      </header>
      <div className={styles.layout}>
        <div className={styles.conversationList}>
          <div className={styles.conversationListHeader}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Фильтр по статусу"
            >
              <option value="">Все статусы</option>
              <option value="OPEN">Открыт</option>
              <option value="IN_PROGRESS">В работе</option>
              <option value="CLOSED">Закрыт</option>
            </select>
          </div>
          {loading ? (
            <div className={styles.loading}>Загрузка диалогов...</div>
          ) : (
            <div className={styles.conversationListScroll}>
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.conversationItem} ${selected?.id === c.id ? styles.active : ''}`}
                  onClick={() => setSelected(c)}
                >
                  <span className={styles.conversationUser}>{userName(c)}</span>
                  <span className={`${styles.statusBadge} ${styles[`status${c.status}`]}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                  <div className={styles.conversationMeta}>{c.user.email}</div>
                  {c.messages?.[0] && (
                    <div className={styles.conversationPreview}>{c.messages[0].content}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.chatArea}>
          {!selected ? (
            <div className={styles.emptyState}>
              Выберите диалог слева, чтобы просмотреть сообщения и ответить клиенту.
            </div>
          ) : (
            <>
              <div className={styles.chatHeader}>
                {userName(selected)} · {selected.user.email}
                <span className={`${styles.statusBadge} ${styles[`status${selected.status}`]}`}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
              </div>
              {loadingMessages ? (
                <div className={styles.loading}>Загрузка сообщений...</div>
              ) : (
                <div className={styles.chatMessages}>
                  {messages.map((m) => {
                    const isMine = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`${styles.chatMessage} ${isMine ? styles.mine : styles.theirs}`}
                      >
                        <div>{m.content}</div>
                        <div className={styles.chatMessageMeta}>
                          {!isMine &&
                            [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ')}
                          {!isMine && ' · '}
                          {formatDate(m.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={styles.chatInputRow}>
                <input
                  type="text"
                  placeholder="Введите ответ..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <button type="button" onClick={sendMessage} disabled={sending || !input.trim()}>
                  Отправить
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
