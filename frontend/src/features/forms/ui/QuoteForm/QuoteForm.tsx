'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { SiteConsentField } from '@/features/site-consent';
import { getQuoteFormOptions } from '@/shared/api/forms';
import { Button } from '@/shared/ui/Button';

import type { QuoteFormData } from '../../types/forms';
import type { QuoteFormProps } from '../types';
import styles from './QuoteForm.module.css';

const DEFAULT_OPTIONS = [
  'Межкомнатные двери',
  'Входные двери',
  'Окна',
  'Потолки',
  'Жалюзи',
  'Мебель',
  'Ремонт квартир',
];

export const QuoteForm: React.FC<QuoteFormProps> = ({
  options: optionsProp,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [options, setOptions] = useState<string[]>(optionsProp ?? []);
  const [optionsLoading, setOptionsLoading] = useState(!optionsProp);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [customOption, setCustomOption] = useState('');
  const [formData, setFormData] = useState<Omit<QuoteFormData, 'selectedOptions' | 'customOption'>>(
    {
      name: '',
      phone: '',
      email: '',
      address: '',
      comment: '',
    }
  );
  const [consent, setConsent] = useState(false);

  const displayOptions = options.length > 0 ? options : DEFAULT_OPTIONS;

  useEffect(() => {
    if (optionsProp !== undefined) return;
    getQuoteFormOptions()
      .then(({ options: opts }) => setOptions(opts))
      .catch(() => setOptions([]))
      .finally(() => setOptionsLoading(false));
  }, [optionsProp]);

  const toggleOption = useCallback((opt: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  }, []);

  const canProceedToStep2 = selectedOptions.size > 0 || customOption.trim().length > 0;

  const handleProceedToStep2 = () => {
    if (!canProceedToStep2) return;
    setStep(2);
  };

  const handleBackToStep1 = () => setStep(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    onSubmit({
      selectedOptions: Array.from(selectedOptions),
      customOption: customOption.trim() || undefined,
      ...formData,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (step === 1) {
    return (
      <div className={styles.form}>
        <h3 className={styles.stepTitle}>
          Выберите интересующие вас позиции (один или несколько вариантов)
        </h3>
        {/* <p className={styles.optionsHint}>Выберите один или несколько вариантов</p> */}
        {optionsLoading ? (
          <p className={styles.loadingHint}>Загрузка вариантов...</p>
        ) : (
          <div className={styles.optionsGrid}>
            {displayOptions.map((opt) => (
              <label
                key={opt}
                className={`${styles.optionCard} ${selectedOptions.has(opt) ? styles.optionCardSelected : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.has(opt)}
                  onChange={() => toggleOption(opt)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>{opt}</span>
              </label>
            ))}
            <div
              className={`${styles.optionCard} ${styles.optionCardCustom} ${customOption.trim() ? styles.optionCardSelected : ''}`}
              onClick={(e) => {
                const input = (e.currentTarget as HTMLDivElement).querySelector('input');
                if (e.target !== input) input?.focus();
              }}
            >
              <input
                type="text"
                value={customOption}
                onChange={(e) => setCustomOption(e.target.value)}
                className={styles.customInput}
                placeholder="Свой вариант"
              />
            </div>
          </div>
        )}
        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleProceedToStep2}
            disabled={!canProceedToStep2 || loading}
          >
            Далее
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.stepTitle}>Ваши контактные данные</h3>
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
            value={formData.email || ''}
            onChange={handleChange}
            className={styles.input}
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className={styles.fieldContainer}>
        <label className={styles.label}>Адрес или описание объекта</label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleChange}
          className={styles.input}
          placeholder="Город, улица, дом или краткое описание"
        />
      </div>

      <div className={styles.fieldContainer}>
        <label className={styles.label}>Комментарий</label>
        <textarea
          name="comment"
          rows={2}
          value={formData.comment || ''}
          onChange={handleChange}
          className={styles.textarea}
          placeholder="Опишите задачу, пожелания..."
        />
      </div>

      <div className={styles.info}>
        <div className={styles.infoContent}>
          <svg className={styles.infoSvg} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className={styles.infoText}>
            Менеджер свяжется с вами в ближайшее время и рассчитает стоимость работ.
          </span>
        </div>
      </div>

      <SiteConsentField checked={consent} onChange={setConsent} />

      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={handleBackToStep1} disabled={loading}>
          Назад
        </Button>
        <Button type="submit" variant="primary" disabled={loading || !consent}>
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </Button>
      </div>
    </form>
  );
};
