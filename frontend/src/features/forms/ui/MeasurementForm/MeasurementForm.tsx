'use client';

import React, { useState } from 'react';

import { Button } from '@/shared/ui/Button';

import type { MeasurementFormData } from '../../types/forms';
import styles from './MeasurementForm.module.css';

export interface MeasurementFormProps {
  onSubmit: (data: MeasurementFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<MeasurementFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: '',
    preferredTime: '',
    productType: '',
    comments: '',
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

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    return dates;
  };

  const productTypes = [
    'Межкомнатные двери',
    'Входные двери',
    'Окна',
    'Потолки',
    'Жалюзи',
    'Мебель',
    'Не знаю, нужна консультация',
  ];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.gridRow1}>
        <div className={styles.fieldContainer}>
          <label className={styles.label}>Имя *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            placeholder="Ваше имя"
          />
        </div>
        <div className={styles.fieldContainer}>
          <label className={styles.label}>Телефон *</label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className={styles.input}
            placeholder="+7 (900) 123-45-67"
          />
        </div>
        <div className={styles.fieldContainer}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            placeholder="your@email.com"
          />
        </div>
        <div className={styles.fieldContainer}>
          <label className={styles.label}>Адрес *</label>
          <input
            type="text"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            className={styles.input}
            placeholder="Город, улица, дом"
          />
        </div>
      </div>

      <div className={styles.gridRow2}>
        <div className={styles.fieldContainer}>
          <label className={styles.label}>Предпочтительная дата замера *</label>
          <select
            name="preferredDate"
            required
            value={formData.preferredDate}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">Выберите дату</option>
            {getAvailableDates().map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                })}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldContainer}>
          <label className={styles.label}>Интересующий товар</label>
          <select
            name="productType"
            value={formData.productType}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">Не выбрано</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.fieldContainer}>
        <label className={styles.label}>Комментарий</label>
        <textarea
          name="comments"
          rows={2}
          value={formData.comments}
          onChange={handleChange}
          className={styles.textarea}
          placeholder="Дополнительная информация..."
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
            Бесплатный выезд специалиста, замеры и расчёт стоимости.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`${styles.actionButton} ${styles.actionButtonCancel}`}
          onClick={onCancel}
          disabled={loading}
        >
          Отмена
        </Button>
        <Button type="submit" variant="primary" className={styles.actionButton} disabled={loading}>
          {loading ? 'Отправка...' : 'Записаться на замер'}
        </Button>
      </div>
    </form>
  );
};
