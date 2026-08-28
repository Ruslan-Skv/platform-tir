'use client';

import { useState } from 'react';

import type { KanbanCard, KanbanCardPriority } from '@/shared/api/kanban/admin-kanban';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';
import { MessengerThreadPanel } from '@/views/admin/Messenger';

import styles from '../KanbanPage.module.css';
import { PRIORITY_LABELS, formatKanbanUser } from '../shared/kanban.utils';

type UserOption = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type KanbanCardModalProps = {
  open: boolean;
  card: KanbanCard | null;
  columnName: string;
  canEdit: boolean;
  busy: boolean;
  users: UserOption[];
  onClose: () => void;
  onSave: (
    payload: Partial<{
      title: string;
      description: string | null;
      priority: KanbanCardPriority;
      labels: string[];
      dueDate: string | null;
      assigneeId: string | null;
    }>
  ) => void;
  onDelete: () => void;
  onPostComment: (body: string) => Promise<void> | void;
  onRemoveComment: (commentId: string) => void;
  onToggleChecklist: (itemId: string) => void;
  onAddChecklist: (text: string) => Promise<void> | void;
};

export function KanbanCardModal({
  open,
  card,
  columnName,
  canEdit,
  busy,
  users,
  onClose,
  onSave,
  onDelete,
  onPostComment,
  onRemoveComment,
  onToggleChecklist,
  onAddChecklist,
}: KanbanCardModalProps) {
  if (!card) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={card.title}
      size="xl"
      alignTop
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <KanbanCardModalBody
        key={card.id}
        card={card}
        columnName={columnName}
        canEdit={canEdit}
        busy={busy}
        users={users}
        onSave={onSave}
        onDelete={onDelete}
        onPostComment={onPostComment}
        onRemoveComment={onRemoveComment}
        onToggleChecklist={onToggleChecklist}
        onAddChecklist={onAddChecklist}
        onClose={onClose}
      />
    </Modal>
  );
}

function KanbanCardModalBody({
  card,
  columnName,
  canEdit,
  busy,
  users,
  onSave,
  onDelete,
  onPostComment,
  onRemoveComment,
  onToggleChecklist,
  onAddChecklist,
  onClose,
}: {
  card: KanbanCard;
  columnName: string;
  canEdit: boolean;
  busy: boolean;
  users: UserOption[];
  onSave: KanbanCardModalProps['onSave'];
  onDelete: () => void;
  onPostComment: (body: string) => Promise<void> | void;
  onRemoveComment: (commentId: string) => void;
  onToggleChecklist: (itemId: string) => void;
  onAddChecklist: (text: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : '');
  const [assigneeId, setAssigneeId] = useState(card.assigneeId ?? '');
  const [commentDraft, setCommentDraft] = useState('');
  const [checklistDraft, setChecklistDraft] = useState('');
  const [labelDraft, setLabelDraft] = useState('');
  const [panelTab, setPanelTab] = useState<'card' | 'chat'>('card');

  return (
    <div
      className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell} ${styles.cardModalLayout}`}
      data-modal-form
      data-modal-density="compact"
    >
      <div>
        <div className={styles.cardModalTabs} role="tablist" aria-label="Разделы карточки">
          <button
            type="button"
            role="tab"
            aria-selected={panelTab === 'card'}
            className={`${styles.cardModalTab} ${panelTab === 'card' ? styles.cardModalTabActive : ''}`}
            onClick={() => setPanelTab('card')}
          >
            Карточка
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panelTab === 'chat'}
            className={`${styles.cardModalTab} ${panelTab === 'chat' ? styles.cardModalTabActive : ''}`}
            onClick={() => setPanelTab('chat')}
          >
            Чат задачи
          </button>
        </div>

        {panelTab === 'chat' ? (
          <div data-modal-form-group data-modal-span>
            <p data-modal-form-hint>
              Отдельный тред по карточке. Комментарии карточки остаются на вкладке «Карточка».
            </p>
            <MessengerThreadPanel cardId={card.id} enabled />
          </div>
        ) : (
          <div data-modal-form-grid>
            <div data-modal-form-group data-modal-span>
              <label htmlFor="kanban-card-title">Заголовок</label>
              <input
                id="kanban-card-title"
                type="text"
                value={title}
                disabled={!canEdit || busy}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (canEdit && title.trim() && title.trim() !== card.title) {
                    onSave({ title: title.trim() });
                  }
                }}
              />
            </div>

            <div data-modal-form-group data-modal-span>
              <label htmlFor="kanban-card-description">Описание</label>
              <textarea
                id="kanban-card-description"
                value={description}
                disabled={!canEdit || busy}
                rows={4}
                placeholder="Детали, бриф, ссылки..."
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (!canEdit) return;
                  const next = description.trim() || null;
                  if (next !== (card.description ?? null)) onSave({ description: next });
                }}
              />
            </div>

            <div data-modal-form-group data-modal-span>
              <label>Чек-лист</label>
              <div className={styles.checklist}>
                {(card.checklist ?? []).map((item) => (
                  <label
                    key={item.id}
                    className={`${styles.checkItem} ${item.done ? styles.checkItemDone : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={!canEdit || busy}
                      onChange={() => onToggleChecklist(item.id)}
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>
              {canEdit ? (
                <div className={styles.inlineRow}>
                  <input
                    type="text"
                    value={checklistDraft}
                    disabled={busy}
                    placeholder="Новый пункт"
                    onChange={(e) => setChecklistDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && checklistDraft.trim()) {
                        e.preventDefault();
                        void Promise.resolve(onAddChecklist(checklistDraft.trim())).then(() =>
                          setChecklistDraft('')
                        );
                      }
                    }}
                  />
                  <button
                    type="button"
                    data-modal-btn="secondary"
                    disabled={busy || !checklistDraft.trim()}
                    onClick={() => {
                      if (!checklistDraft.trim()) return;
                      void Promise.resolve(onAddChecklist(checklistDraft.trim())).then(() =>
                        setChecklistDraft('')
                      );
                    }}
                  >
                    Добавить
                  </button>
                </div>
              ) : null}
            </div>

            <div data-modal-form-group data-modal-span>
              <label>Комментарии</label>
              <div className={styles.comments}>
                {card.comments.length === 0 ? (
                  <p data-modal-form-hint>Пока нет обсуждения</p>
                ) : (
                  card.comments.map((comment) => (
                    <div key={comment.id} className={styles.comment}>
                      <div className={styles.commentMeta}>
                        <span>{formatKanbanUser(comment.author)}</span>
                        <span>
                          {new Date(comment.createdAt).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {canEdit ? (
                            <>
                              {' · '}
                              <button
                                type="button"
                                className={styles.labelRemove}
                                onClick={() => onRemoveComment(comment.id)}
                              >
                                удалить
                              </button>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <p className={styles.commentBody}>{comment.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className={styles.inlineRow}>
                <input
                  type="text"
                  value={commentDraft}
                  disabled={busy}
                  placeholder="Написать комментарий"
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentDraft.trim()) {
                      e.preventDefault();
                      void Promise.resolve(onPostComment(commentDraft.trim())).then(() =>
                        setCommentDraft('')
                      );
                    }
                  }}
                />
                <button
                  type="button"
                  data-modal-btn="primary"
                  disabled={busy || !commentDraft.trim()}
                  onClick={() => {
                    if (!commentDraft.trim()) return;
                    void Promise.resolve(onPostComment(commentDraft.trim())).then(() =>
                      setCommentDraft('')
                    );
                  }}
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className={styles.cardModalSide}>
        <div data-modal-form-group>
          <label>Колонка</label>
          <p className={styles.sideReadonly}>{columnName || '—'}</p>
        </div>

        <div data-modal-form-group>
          <label htmlFor="kanban-card-priority">Приоритет</label>
          <select
            id="kanban-card-priority"
            value={priority}
            disabled={!canEdit || busy}
            onChange={(e) => {
              const next = e.target.value as KanbanCardPriority;
              setPriority(next);
              onSave({ priority: next });
            }}
          >
            {(Object.keys(PRIORITY_LABELS) as KanbanCardPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label htmlFor="kanban-card-due">Срок</label>
          <input
            id="kanban-card-due"
            type="date"
            value={dueDate}
            disabled={!canEdit || busy}
            onChange={(e) => {
              const next = e.target.value;
              setDueDate(next);
              onSave({ dueDate: next || null });
            }}
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="kanban-card-assignee">Исполнитель</label>
          <select
            id="kanban-card-assignee"
            value={assigneeId}
            disabled={!canEdit || busy}
            onChange={(e) => {
              const next = e.target.value;
              setAssigneeId(next);
              onSave({ assigneeId: next || null });
            }}
          >
            <option value="">Не назначен</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {formatKanbanUser(u)}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label>Метки</label>
          <div className={styles.labelEditor}>
            {card.labels.map((label) => (
              <span key={label} className={styles.labelChip}>
                {label}
                {canEdit ? (
                  <button
                    type="button"
                    className={styles.labelRemove}
                    onClick={() => onSave({ labels: card.labels.filter((l) => l !== label) })}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
          {canEdit ? (
            <div className={styles.inlineRow}>
              <input
                type="text"
                value={labelDraft}
                disabled={busy}
                placeholder="Новая метка"
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && labelDraft.trim()) {
                    e.preventDefault();
                    onSave({ labels: Array.from(new Set([...card.labels, labelDraft.trim()])) });
                    setLabelDraft('');
                  }
                }}
              />
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={busy || !labelDraft.trim()}
                onClick={() => {
                  if (!labelDraft.trim()) return;
                  onSave({ labels: Array.from(new Set([...card.labels, labelDraft.trim()])) });
                  setLabelDraft('');
                }}
              >
                +
              </button>
            </div>
          ) : null}
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={busy}>
            Закрыть
          </button>
          {canEdit ? (
            <button type="button" data-modal-btn="secondary" disabled={busy} onClick={onDelete}>
              Удалить
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
