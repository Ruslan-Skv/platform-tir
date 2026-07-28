'use client';

import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './SupportChatPage.module.css';
import type { SupportChatPageModel } from './hooks/useSupportChatPage';
import { STATUS_FILTER_OPTIONS, STATUS_LABELS } from './support-chat-page.constants';
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
    refreshing,
    loadingMessages,
    sending,
    sendMessage,
    refresh,
  } = model;
  const refreshBusy = loading || refreshing || loadingMessages;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Чат поддержки</h1>
        </div>
        <div className={styles.headerActions}>
          <AdminListRefreshButton
            onClick={() => void refresh()}
            disabled={refreshBusy}
            busy={refreshBusy}
            title="Обновить"
            aria-label="Обновить список диалогов"
          />
        </div>
      </header>
      <div className={styles.layout}>
        <div className={styles.conversationList}>
          <div className={styles.conversationListHeader}>
            <div className={styles.chipRow} role="group" aria-label="Статус диалога">
              <span className={styles.chipRowLabel}>Статус</span>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  disabled={refreshBusy}
                  className={`${styles.filterChip} ${statusFilter === opt.value ? styles.filterChipActive : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
                <button
                  data-admin-mutation
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                >
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
