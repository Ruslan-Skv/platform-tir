'use client';

import React, { useEffect, useRef, useState } from 'react';

import formStyles from './FormsSettingsSection.module.css';

export interface NotifyChannelsValue {
  notifyEmails: string[];
  notifyTelegramIds: string[];
  notifyMaxIds: string[];
}

interface LinesTextareaProps {
  id: string;
  label: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  values: string[];
  onChange: (values: string[]) => void;
}

// Список «одно значение на строку». Держим сырой текст локально: контролируемое
// значение из нормализованного массива мгновенно удаляло бы Enter в конце строки,
// и перейти на новую строку в поле было бы невозможно.
export function LinesTextarea({
  id,
  label,
  placeholder,
  hint,
  rows = 3,
  values,
  onChange,
}: LinesTextareaProps) {
  const [text, setText] = useState(values.join('\n'));
  // Последний массив, отданный наверх: если родитель сохранил его как есть,
  // синхронизацию не запускаем — иначе сбрасывался бы ввод. Внешние обновления
  // (например, загрузка настроек с сервера) приходят с новой ссылкой — подтянем их.
  const emitted = useRef(values);

  useEffect(() => {
    if (emitted.current !== values) {
      emitted.current = values;
      setText(values.join('\n'));
    }
  }, [values]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = event.target.value;
    setText(raw);
    const parsed = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    emitted.current = parsed;
    onChange(parsed);
  };

  return (
    <div className={formStyles.formGroup}>
      <label htmlFor={id} className={formStyles.formLabel}>
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className={formStyles.formTextarea}
      />
      {hint ? <p className={formStyles.fieldHint}>{hint}</p> : null}
    </div>
  );
}

interface NotifyChannelsFieldsProps {
  value: NotifyChannelsValue;
  onChange: (value: NotifyChannelsValue) => void;
  idPrefix?: string;
}

export function NotifyChannelsFields({
  value,
  onChange,
  idPrefix = 'notify',
}: NotifyChannelsFieldsProps) {
  return (
    <>
      <LinesTextarea
        id={`${idPrefix}-emails`}
        label="Email (каждый с новой строки)"
        placeholder={'manager@company.ru\ndirector@company.ru'}
        values={value.notifyEmails}
        onChange={(notifyEmails) => onChange({ ...value, notifyEmails })}
      />
      <LinesTextarea
        id={`${idPrefix}-telegram`}
        label="Telegram chat ID (каждый с новой строки)"
        placeholder={'-1001234567890\n123456789'}
        hint="Нужен TELEGRAM_BOT_TOKEN в .env сервера."
        values={value.notifyTelegramIds}
        onChange={(notifyTelegramIds) => onChange({ ...value, notifyTelegramIds })}
      />
      <LinesTextarea
        id={`${idPrefix}-max`}
        label="MAX chat ID (каждый с новой строки)"
        placeholder={'-7000000000012345\n355092160'}
        hint="Нужен MAX_BOT_TOKEN в .env сервера."
        values={value.notifyMaxIds}
        onChange={(notifyMaxIds) => onChange({ ...value, notifyMaxIds })}
      />
    </>
  );
}
