'use client';

import React, { useState } from 'react';

import { Button } from '@/shared/ui/Button';

import type { DirectorMessageFormData } from '../../types/forms';
import styles from './DirectorMessageForm.module.css';

export interface DirectorMessageFormProps {
  onSubmit: (data: DirectorMessageFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DirectorMessageForm: React.FC<DirectorMessageFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<DirectorMessageFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.gridRow1}>
        <div>
          <label className={styles.label}>Ваше имя *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            placeholder="Иванов Иван"
          />
        </div>
        <div>
          <label className={styles.label}>Email *</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className={styles.label}>Телефон</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={styles.input}
            placeholder="+7 (900) 123-45-67"
          />
        </div>
        <div>
          <label className={styles.label}>Тема *</label>
          <select
            name="subject"
            required
            value={formData.subject}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">Выберите тему</option>
            <option value="complaint">Жалоба</option>
            <option value="suggestion">Предложение</option>
            <option value="cooperation">Сотрудничество</option>
            <option value="question">Вопрос</option>
            <option value="other">Другое</option>
          </select>
        </div>
      </div>

      <div>
        <label className={styles.label}>Сообщение *</label>
        <textarea
          name="message"
          rows={4}
          required
          value={formData.message}
          onChange={handleChange}
          className={styles.textarea}
          placeholder="Опишите вашу ситуацию, вопрос или предложение..."
        />
      </div>

      <div className={styles.info}>
        <div className={styles.infoContent}>
          <svg className={styles.infoSvg} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span className={styles.infoText}>
            Письмо будет отправлено директору. Конфиденциальность и ответ в течение 24 часов.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить письмо'}
        </Button>
      </div>
    </form>
  );
};
