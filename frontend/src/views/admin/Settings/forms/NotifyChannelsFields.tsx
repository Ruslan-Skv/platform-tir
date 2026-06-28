'use client';

import React from 'react';

import formStyles from './FormsSettingsSection.module.css';

export interface NotifyChannelsValue {
  notifyEmails: string[];
  notifyTelegramIds: string[];
  notifyMaxIds: string[];
}

interface NotifyChannelsFieldsProps {
  value: NotifyChannelsValue;
  onChange: (value: NotifyChannelsValue) => void;
  idPrefix?: string;
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NotifyChannelsFields({
  value,
  onChange,
  idPrefix = 'notify',
}: NotifyChannelsFieldsProps) {
  return (
    <>
      <div className={formStyles.formGroup}>
        <label htmlFor={`${idPrefix}-emails`} className={formStyles.formLabel}>
          Email (каждый с новой строки)
        </label>
        <textarea
          id={`${idPrefix}-emails`}
          value={value.notifyEmails.join('\n')}
          onChange={(e) => onChange({ ...value, notifyEmails: parseLines(e.target.value) })}
          placeholder={'manager@company.ru\ndirector@company.ru'}
          rows={3}
          className={formStyles.formTextarea}
        />
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor={`${idPrefix}-telegram`} className={formStyles.formLabel}>
          Telegram chat ID (каждый с новой строки)
        </label>
        <textarea
          id={`${idPrefix}-telegram`}
          value={value.notifyTelegramIds.join('\n')}
          onChange={(e) => onChange({ ...value, notifyTelegramIds: parseLines(e.target.value) })}
          placeholder={'-1001234567890\n123456789'}
          rows={3}
          className={formStyles.formTextarea}
        />
        <p className={formStyles.fieldHint}>Нужен TELEGRAM_BOT_TOKEN в .env сервера.</p>
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor={`${idPrefix}-max`} className={formStyles.formLabel}>
          MAX chat ID (каждый с новой строки)
        </label>
        <textarea
          id={`${idPrefix}-max`}
          value={value.notifyMaxIds.join('\n')}
          onChange={(e) => onChange({ ...value, notifyMaxIds: parseLines(e.target.value) })}
          placeholder="-1234567890"
          rows={3}
          className={formStyles.formTextarea}
        />
        <p className={formStyles.fieldHint}>Нужен MAX_BOT_TOKEN в .env сервера.</p>
      </div>
    </>
  );
}
