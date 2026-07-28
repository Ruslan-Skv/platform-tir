'use client';

import { useState } from 'react';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import styles from './SupportChatPage.module.css';
import { SupportChatRulesInfoTip } from './help/SupportChatRulesInfoTip';
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
    deleting,
    sendMessage,
    deleteConversation,
    refresh,
    canDelete,
  } = model;
  const refreshBusy = loading || refreshing || loadingMessages || deleting;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Чат поддержки</h1>
            <SupportChatRulesInfoTip />
          </div>
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
                <div className={styles.chatHeaderInfo}>
                  {userName(selected)} · {selected.user.email}
                  <span className={`${styles.statusBadge} ${styles[`status${selected.status}`]}`}>
                    {STATUS_LABELS[selected.status] ?? selected.status}
                  </span>
                </div>
                {canDelete ? (
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.deleteButton}
                    disabled={deleting}
                    onClick={() => setConfirmDelete(true)}
                    title={deleting ? 'Удаление...' : 'Удалить диалог'}
                    aria-label={deleting ? 'Удаление...' : 'Удалить диалог'}
                  >
                    <DeleteIcon size={16} tone="inherit" />
                  </button>
                ) : null}
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

      {selected && confirmDelete ? (
        <ConfirmModal
          isOpen
          title="Удалить диалог?"
          message={`Диалог с ${userName(selected)} и все сообщения будут удалены без возможности восстановления.`}
          onConfirm={() => {
            const id = selected.id;
            setConfirmDelete(false);
            void deleteConversation(id);
          }}
          onClose={() => setConfirmDelete(false)}
          confirmText={deleting ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      ) : null}
    </div>
  );
}
