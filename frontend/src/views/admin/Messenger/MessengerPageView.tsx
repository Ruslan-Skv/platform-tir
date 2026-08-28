'use client';

import { type FormEvent, useEffect, useRef } from 'react';

import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './MessengerPage.module.css';
import type { MessengerPageModel } from './hooks/useMessengerPage';
import { MessengerChannelModal } from './modals/MessengerChannelModal';
import { MessengerDirectModal } from './modals/MessengerDirectModal';
import { MessengerEmojiPicker } from './shared/MessengerEmojiPicker';
import { MessengerRulesInfoTip } from './shared/MessengerRulesInfoTip';
import { insertTextAtCursor } from './shared/messenger-composer.utils';
import {
  formatMessageTime,
  formatMessengerUser,
  messengerUserInitials,
  previewBody,
} from './shared/messenger.utils';

type Props = { model: MessengerPageModel };

export function MessengerPageView({ model }: Props) {
  const {
    canEdit,
    currentUserId,
    listTab,
    setListTab,
    listItems,
    selectedId,
    activeDetail,
    messages,
    users,
    input,
    setInput,
    loading,
    loadingMessages,
    sending,
    busy,
    errorMessage,
    reload,
    selectConversation,
    sendMessage,
    channelModalOpen,
    setChannelModalOpen,
    channelTitle,
    setChannelTitle,
    channelMemberIds,
    setChannelMemberIds,
    openChannelModal,
    submitChannel,
    dmModalOpen,
    setDmModalOpen,
    dmUserId,
    setDmUserId,
    openDmModal,
    submitDm,
  } = model;

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  const memberNames =
    activeDetail?.members
      .map((m) => formatMessengerUser(m.user))
      .slice(0, 8)
      .join(', ') ?? '';

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <h1 className={styles.title}>Мессенджер</h1>
            <MessengerRulesInfoTip />
          </div>
        </div>
        <div className={cdHub.contractsListHeaderActions}>
          <AdminListRefreshButton
            onClick={() => void reload()}
            disabled={loading || busy}
            busy={loading}
            title="Обновить"
            aria-label="Обновить мессенджер"
          />
        </div>
      </div>

      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.tabs} role="tablist" aria-label="Тип чатов">
            <button
              type="button"
              role="tab"
              aria-selected={listTab === 'channels'}
              className={`${styles.tab} ${listTab === 'channels' ? styles.tabActive : ''}`}
              onClick={() => setListTab('channels')}
            >
              Каналы
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={listTab === 'direct'}
              className={`${styles.tab} ${listTab === 'direct' ? styles.tabActive : ''}`}
              onClick={() => setListTab('direct')}
            >
              Личные
            </button>
          </div>
          <div className={styles.sideActions}>
            {listTab === 'channels' ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={!canEdit || busy}
                onClick={openChannelModal}
              >
                + Новый канал
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={openDmModal}
              >
                + Новый чат
              </button>
            )}
          </div>
          <div className={styles.list}>
            {loading && listItems.length === 0 ? (
              <p className={styles.emptyList}>Загрузка…</p>
            ) : listItems.length === 0 ? (
              <p className={styles.emptyList}>
                {listTab === 'channels' ? 'Нет каналов' : 'Нет личных чатов'}
              </p>
            ) : (
              listItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.listItem} ${selectedId === item.id ? styles.listItemActive : ''}`}
                  onClick={() => void selectConversation(item.id)}
                >
                  <div className={styles.listItemTitleRow}>
                    <span className={styles.listItemTitle}>
                      {item.type === 'CHANNEL' ? `# ${item.title}` : item.title}
                    </span>
                    {item.unreadCount > 0 ? (
                      <span className={styles.unreadBadge}>{item.unreadCount}</span>
                    ) : null}
                  </div>
                  <span className={styles.listItemPreview}>
                    {item.lastMessage
                      ? previewBody(
                          `${formatMessengerUser(item.lastMessage.author)}: ${item.lastMessage.body}`
                        )
                      : 'Нет сообщений'}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={styles.chatPane}>
          {!selectedId || !activeDetail ? (
            <div className={styles.messages}>
              <p className={styles.emptyList}>Выберите чат слева</p>
            </div>
          ) : (
            <>
              <header className={styles.chatHeader}>
                <h2 className={styles.chatTitle}>
                  {activeDetail.type === 'CHANNEL' ? `# ${activeDetail.title}` : activeDetail.title}
                </h2>
                <p className={styles.chatMeta}>
                  {activeDetail.members.length} участник
                  {activeDetail.members.length === 1 ? '' : 'а'}
                  {memberNames ? `: ${memberNames}` : ''}
                  {activeDetail.members.length > 8 ? '…' : ''}
                </p>
              </header>
              <div className={styles.messages}>
                {loadingMessages ? <p className={styles.emptyList}>Загрузка сообщений…</p> : null}
                {!loadingMessages && messages.length === 0 ? (
                  <p className={styles.emptyList}>Напишите первое сообщение</p>
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
                          <span className={styles.messageTime}>
                            {formatMessageTime(m.createdAt)}
                          </span>
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
                    disabled={sending}
                    onPick={(emoji) => insertTextAtCursor(inputRef.current, input, emoji, setInput)}
                  />
                  <textarea
                    ref={inputRef}
                    className={styles.composerInput}
                    rows={2}
                    value={input}
                    disabled={sending}
                    placeholder="Сообщение…"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={sending || !input.trim()}
                >
                  Отправить
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      <MessengerChannelModal
        open={channelModalOpen}
        busy={busy}
        title={channelTitle}
        memberIds={channelMemberIds}
        users={users}
        onTitleChange={setChannelTitle}
        onMemberIdsChange={setChannelMemberIds}
        onClose={() => setChannelModalOpen(false)}
        onSubmit={() => void submitChannel()}
      />
      <MessengerDirectModal
        open={dmModalOpen}
        busy={busy}
        userId={dmUserId}
        users={users}
        onUserIdChange={setDmUserId}
        onClose={() => setDmModalOpen(false)}
        onSubmit={() => void submitDm()}
      />
    </div>
  );
}
