'use client';

import styles from './SupportChatPage.module.css';
import type { SupportChatPageModel } from './hooks/useSupportChatPage';
import { STATUS_LABELS } from './support-chat-page.constants';
import { formatDate, userName } from './support-chat-page.utils';

type SupportChatPageViewProps = {
  model: SupportChatPageModel;
};

export function SupportChatPageView({ model }: SupportChatPageViewProps) {
  const {
    user,
    conversations,
    selected,
    setSelected,
    messages,
    statusFilter,
    setStatusFilter,
    input,
    setInput,
    loading,
    loadingMessages,
    sending,
    sendMessage,
  } = model;

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
