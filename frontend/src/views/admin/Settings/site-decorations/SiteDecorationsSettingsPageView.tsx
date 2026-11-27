'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminSiteDecorations,
  updateAdminSiteDecoration,
} from '@/shared/api/admin-site-decorations';
import type { AdminSiteDecoration } from '@/shared/api/admin-site-decorations';

import styles from './SiteDecorationsSettingsPage.module.css';

/** Черновик формы: даты — в локальном формате input[type=datetime-local]. */
interface DecorationDraft {
  code: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  /** Выбранный вариант (null — у украшения нет вариантов). */
  variant: string | null;
}

const pad = (value: number) => String(value).padStart(2, '0');

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDraft(decoration: AdminSiteDecoration): DecorationDraft {
  return {
    code: decoration.code,
    isActive: decoration.isActive,
    startsAt: isoToLocalInput(decoration.startsAt),
    endsAt: isoToLocalInput(decoration.endsAt),
    variant: decoration.variant ?? decoration.variants[0]?.value ?? null,
  };
}

function isDraftChanged(draft: DecorationDraft, saved: AdminSiteDecoration | undefined): boolean {
  if (!saved) return true;
  return (
    draft.isActive !== saved.isActive ||
    localInputToIso(draft.startsAt) !== (saved.startsAt ?? null) ||
    localInputToIso(draft.endsAt) !== (saved.endsAt ?? null) ||
    draft.variant !== (saved.variant ?? saved.variants[0]?.value ?? null)
  );
}

export function SiteDecorationsSettingsPageView() {
  const { user } = useAuth();
  const [decorations, setDecorations] = useState<AdminSiteDecoration[] | null>(null);
  const [drafts, setDrafts] = useState<DecorationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminSiteDecorations();
      setDecorations(data);
      setDrafts(data.map(toDraft));
    } catch {
      setDecorations(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (code: string, patch: Partial<DecorationDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.code === code ? { ...draft, ...patch } : draft))
    );
  };

  const hasChanges = useMemo(
    () =>
      drafts.some((draft) =>
        isDraftChanged(
          draft,
          decorations?.find((decoration) => decoration.code === draft.code)
        )
      ),
    [drafts, decorations]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!decorations) return;
    setSaving(true);
    setMessage(null);
    try {
      const changed = drafts.filter((draft) =>
        isDraftChanged(
          draft,
          decorations.find((decoration) => decoration.code === draft.code)
        )
      );
      for (const draft of changed) {
        const title =
          decorations.find((decoration) => decoration.code === draft.code)?.title ?? draft.code;
        const startsAt = localInputToIso(draft.startsAt);
        const endsAt = localInputToIso(draft.endsAt);
        if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
          throw new Error(`«${title}»: начало периода показа не может быть позже конца`);
        }
        await updateAdminSiteDecoration(draft.code, {
          isActive: draft.isActive,
          startsAt,
          endsAt,
          ...(decorations.find((decoration) => decoration.code === draft.code)?.variants.length && {
            variant: draft.variant,
          }),
        });
      }
      setMessage({ text: 'Настройки сохранены' });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className={styles.page}>
        <p className={styles.accessDenied}>
          Управление украшениями сайта доступно только супер-администратору.
        </p>
      </div>
    );
  }

  if (loading || !decorations) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Украшения сайта</h1>
        <p className={styles.subtitle}>
          Праздничные украшения публичного сайта (601270.ru): снег, гирлянды и т.п. Влияют только на
          публичную часть, админка не меняется.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {message && (
          <div className={message.error ? styles.toastError : styles.toastSuccess}>
            {message.text}
          </div>
        )}

        {decorations.map((decoration) => {
          const draft = drafts.find((item) => item.code === decoration.code);
          if (!draft) return null;
          return (
            <section key={decoration.code} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardText}>
                  <h2 className={styles.cardTitle}>{decoration.title}</h2>
                  <p className={styles.cardDescription}>{decoration.description}</p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => updateDraft(decoration.code, { isActive: e.target.checked })}
                  />
                  <span>Включено</span>
                </label>
              </div>

              {decoration.variants.length > 0 && (
                <fieldset className={styles.variants}>
                  <legend className={styles.variantsLabel}>Вариант</legend>
                  <div className={styles.variantList}>
                    {decoration.variants.map((variant) => (
                      <label key={variant.value} className={styles.variantLabel}>
                        <input
                          type="radio"
                          name={`variant-${decoration.code}`}
                          value={variant.value}
                          checked={draft.variant === variant.value}
                          onChange={() => updateDraft(decoration.code, { variant: variant.value })}
                        />
                        <span>{variant.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className={styles.periodRow}>
                <label className={styles.periodField}>
                  <span className={styles.periodLabel}>Начало показа</span>
                  <input
                    type="datetime-local"
                    step={1}
                    value={draft.startsAt}
                    onChange={(e) => updateDraft(decoration.code, { startsAt: e.target.value })}
                  />
                </label>
                <label className={styles.periodField}>
                  <span className={styles.periodLabel}>Окончание показа</span>
                  <input
                    type="datetime-local"
                    step={1}
                    value={draft.endsAt}
                    onChange={(e) => updateDraft(decoration.code, { endsAt: e.target.value })}
                  />
                </label>
              </div>
              <p className={styles.hint}>
                Период необязателен: если задан, украшение само включается и выключается в эти даты
                (по местному времени посетителя). Очистите поле, чтобы снять ограничение.
              </p>
            </section>
          );
        })}

        <div className={styles.actions}>
          <button
            data-admin-mutation
            type="submit"
            className={styles.saveButton}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/" target="_blank" rel="noreferrer" className={styles.previewLink}>
            Открыть публичку →
          </Link>
        </div>
      </form>
    </div>
  );
}
