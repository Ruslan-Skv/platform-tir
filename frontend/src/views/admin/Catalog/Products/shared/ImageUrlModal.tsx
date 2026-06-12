'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';

import styles from './ImageUrlModal.module.css';

type ImageUrlModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Вызывается с непустым URL после нажатия «Добавить» */
  onConfirm: (url: string) => void;
};

export function ImageUrlModal({ isOpen, onClose, onConfirm }: ImageUrlModalProps) {
  const [value, setValue] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить изображение по URL" size="sm">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor={inputId} className={styles.label}>
            Ссылка на изображение
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="url"
            name="imageUrl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={styles.input}
            placeholder="https://…"
            autoComplete="url"
          />
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.buttonSecondary} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className={styles.buttonPrimary} disabled={!value.trim()}>
            Добавить
          </button>
        </div>
      </form>
    </Modal>
  );
}
