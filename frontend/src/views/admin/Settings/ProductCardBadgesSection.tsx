'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './ProductCardBadgesSection.module.css';

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
      <div className={styles.root}>
        <p className={styles.loading}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {toast && (
        <p
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.message}
        </p>
      )}
      <section>
        <p className={styles.intro}>
          Загрузите картинки в формате JPEG для каждого типа бэйджа и при необходимости укажите
          описание — оно показывается покупателю при наведении на бэйдж. На карточке товара (слева
          от фото) отображаются только выбранные для товара бэйджи с загруженным изображением (не
          более 5 на товар — задаётся в карточке товара).
        </p>
        <div className={styles.list}>
          {rows.map((row) => (
            <div key={row.id} className={styles.row}>
              <span className={styles.order}>{row.sortOrder}.</span>
              <div className={styles.main}>
                <div className={styles.badgeTitle}>{row.label}</div>
                <label htmlFor={`badge-desc-${row.id}`} className={styles.fieldLabel}>
                  Описание (подсказка при наведении)
                </label>
                <div className={styles.descRow}>
                  <textarea
                    id={`badge-desc-${row.id}`}
                    rows={2}
                    value={descDraft[row.id] ?? ''}
                    onChange={(e) =>
                      setDescDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    disabled={uploadingId !== null}
                    className={styles.textarea}
                    placeholder="Краткий текст для всплывающей подсказки на сайте"
                  />
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={() => void handleSaveDescription(row.id, descDraft[row.id] ?? '')}
                    disabled={
                      uploadingId !== null || (descDraft[row.id] ?? '') === (row.description ?? '')
                    }
                  >
                    Сохранить описание
                  </button>
                </div>
              </div>
              <div className={styles.thumbWrap}>
                {row.imageUrl ? (
                  <img src={publicUploadUrl(row.imageUrl)} alt="" className={styles.thumbImg} />
                ) : (
                  <span className={styles.thumbEmpty}>нет</span>
                )}
              </div>
              <label
                className={`${styles.uploadLabel} ${uploadingId === row.id ? styles.uploadLabelWait : ''}`}
              >
                <span className={styles.uploadBtn}>
                  {uploadingId === row.id ? '…' : 'Загрузить JPG'}
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  className={styles.fileInput}
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
                  className={styles.clearBtn}
                  onClick={() => void handleClear(row.id)}
                  disabled={uploadingId !== null}
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
