'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './UserCabinetSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ProductCardBadgeDefinition {
  id: string;
  key: string;
  label: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export function ProductCardBadgesSection() {
  const { getAuthHeaders } = useAuth();
  const [rows, setRows] = useState<ProductCardBadgeDefinition[]>([]);
  /** Локальный текст описаний по id (синхронизируется при load) */
  const [descDraft, setDescDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/product-card-badges/definitions`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Не удалось загрузить список');
      const data = (await res.json()) as ProductCardBadgeDefinition[];
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setDescDraft(Object.fromEntries(list.map((r) => [r.id, r.description ?? ''])));
    } catch (e) {
      console.error(e);
      setRows([]);
      showToast('Ошибка загрузки списка бэйджей', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (id: string, file: File) => {
    if (!/\.jpe?g$/i.test(file.name) && file.type !== 'image/jpeg') {
      showToast('Допустим только JPEG (.jpg)', 'error');
      return;
    }
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/admin/product-card-badges/definitions/${id}/upload`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || 'Ошибка загрузки');
      }
      await load();
      showToast('Изображение сохранено', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка загрузки', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const handleSaveDescription = async (id: string, description: string) => {
    setUploadingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/product-card-badges/definitions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ description: description.trim() || null }),
      });
      if (!res.ok) throw new Error('Не удалось сохранить описание');
      await load();
      showToast('Описание сохранено', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const handleClear = async (id: string) => {
    setUploadingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/product-card-badges/definitions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ imageUrl: null }),
      });
      if (!res.ok) throw new Error('Не удалось удалить изображение');
      await load();
      showToast('Изображение снято', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {toast && (
        <p
          className={styles.toast}
          style={
            toast.type === 'success'
              ? { background: 'rgb(34 197 94 / 20%)', color: 'rgb(22 163 74)' }
              : { background: 'rgb(239 68 68 / 20%)', color: 'rgb(185 28 28)' }
          }
        >
          {toast.message}
        </p>
      )}
      <section className={styles.section}>
        <p className={styles.sectionDescription} style={{ marginBottom: '1rem' }}>
          Загрузите картинки в формате JPEG для каждого типа бэйджа и при необходимости укажите
          описание — оно показывается покупателю при наведении на бэйдж. На карточке товара (слева
          от фото) отображаются только выбранные для товара бэйджи с загруженным изображением (не
          более 5 на товар — задаётся в карточке товара).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                background: '#fafafa',
              }}
            >
              <span style={{ minWidth: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                {row.sortOrder}.
              </span>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 500, marginBottom: '0.35rem' }}>{row.label}</div>
                <label
                  htmlFor={`badge-desc-${row.id}`}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  Описание (подсказка при наведении)
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    width: '100%',
                  }}
                >
                  <textarea
                    id={`badge-desc-${row.id}`}
                    rows={2}
                    value={descDraft[row.id] ?? ''}
                    onChange={(e) =>
                      setDescDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    disabled={uploadingId !== null}
                    style={{
                      flex: '1 1 auto',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: '0.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      fontSize: '0.875rem',
                      resize: 'vertical',
                    }}
                    placeholder="Краткий текст для всплывающей подсказки на сайте"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveDescription(row.id, descDraft[row.id] ?? '')}
                    disabled={
                      uploadingId !== null || (descDraft[row.id] ?? '') === (row.description ?? '')
                    }
                    style={{
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      padding: '0.45rem 0.65rem',
                      border: 'none',
                      borderRadius: 6,
                      background: '#d90652',
                      color: '#fff',
                      cursor:
                        uploadingId !== null ||
                        (descDraft[row.id] ?? '') === (row.description ?? '')
                          ? 'not-allowed'
                          : 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      opacity:
                        uploadingId !== null ||
                        (descDraft[row.id] ?? '') === (row.description ?? '')
                          ? 0.55
                          : 1,
                    }}
                  >
                    Сохранить описание
                  </button>
                </div>
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  border: '1px dashed #d1d5db',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {row.imageUrl ? (
                  <img
                    src={publicUploadUrl(row.imageUrl)}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', textAlign: 'center' }}>
                    нет
                  </span>
                )}
              </div>
              <label style={{ cursor: uploadingId === row.id ? 'wait' : 'pointer' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.75rem',
                    background: '#d90652',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                  }}
                >
                  {uploadingId === row.id ? '…' : 'Загрузить JPG'}
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  style={{ display: 'none' }}
                  disabled={uploadingId !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void handleUpload(row.id, f);
                  }}
                />
              </label>
              {row.imageUrl && (
                <button
                  type="button"
                  onClick={() => void handleClear(row.id)}
                  disabled={uploadingId !== null}
                  style={{
                    padding: '0.35rem 0.75rem',
                    border: 'none',
                    borderRadius: 6,
                    background: '#64748b',
                    color: '#fff',
                    fontWeight: 500,
                    cursor: uploadingId ? 'wait' : 'pointer',
                    opacity: uploadingId !== null ? 0.6 : 1,
                  }}
                >
                  Снять
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
