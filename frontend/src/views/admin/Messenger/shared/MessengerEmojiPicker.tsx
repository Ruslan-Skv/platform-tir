'use client';

import { useEffect, useId, useRef, useState } from 'react';

import styles from '../MessengerPage.module.css';

/** Часто используемые эмодзи для быстрой вставки в сообщение. */
export const MESSENGER_EMOJI_LIST = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '😂',
  '🤣',
  '😊',
  '😇',
  '🙂',
  '😉',
  '😍',
  '🥰',
  '😘',
  '😜',
  '🤪',
  '🤗',
  '🤭',
  '🤫',
  '🤔',
  '🤨',
  '😐',
  '😑',
  '😶',
  '🙄',
  '😏',
  '😣',
  '😮',
  '😯',
  '😪',
  '😫',
  '🥱',
  '😴',
  '🤤',
  '😒',
  '😓',
  '😔',
  '😕',
  '🙃',
  '😲',
  '☹️',
  '🙁',
  '😖',
  '😞',
  '😟',
  '😤',
  '😢',
  '😭',
  '😨',
  '😩',
  '🤯',
  '😬',
  '😰',
  '😱',
  '🥵',
  '🥶',
  '😳',
  '😵',
  '😡',
  '😠',
  '🤬',
  '😷',
  '🤒',
  '🤕',
  '🤢',
  '🤮',
  '🤧',
  '😈',
  '👿',
  '💀',
  '💩',
  '🤡',
  '👻',
  '🤖',
  '👍',
  '👎',
  '👌',
  '✌️',
  '🤞',
  '🤟',
  '🤘',
  '🤙',
  '👋',
  '👏',
  '🙌',
  '🤝',
  '🙏',
  '💪',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '💔',
  '💕',
  '💞',
  '💖',
  '💘',
  '✅',
  '❌',
  '⭐',
  '🌟',
  '💫',
  '🔥',
  '✨',
  '🎉',
  '🎊',
  '🎈',
  '🏆',
  '🥇',
  '🎯',
  '📌',
  '💡',
  '📝',
  '📎',
  '🔗',
  '⏰',
  '📅',
  '🚀',
  '☕',
  '🍕',
  '🍔',
  '🍰',
  '🍺',
] as const;

type Props = {
  disabled?: boolean;
  onPick: (emoji: string) => void;
};

export function MessengerEmojiPicker({ disabled, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.emojiPickerRoot} ref={rootRef}>
      <button
        type="button"
        className={styles.emojiPickerToggle}
        disabled={disabled}
        aria-label="Смайлики"
        title="Смайлики"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        😊
      </button>
      {open ? (
        <div id={listId} className={styles.emojiPickerPanel} role="listbox" aria-label="Смайлики">
          {MESSENGER_EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.emojiPickerItem}
              role="option"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
