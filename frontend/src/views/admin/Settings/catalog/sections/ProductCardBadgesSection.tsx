'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from '../shared/ProductCardBadgesSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function isAllowedBadgeImageFile(file: File): boolean {
  const byName = /\.(png|jpe?g)$/i.test(file.name);
  const byType =
    file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/pjpeg';
  return byName || byType;
}

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/product-card-badges/definitions`, {
        cache: 'no-store',
      });
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
    if (!isAllowedBadgeImageFile(file)) {
      showToast('Допустимы PNG или JPEG (.png, .jpg, .jpeg)', 'error');
      return;
    }
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(`${API_URL}/admin/product-card-badges/definitions/${id}/upload`, {
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
      const res = await apiFetch(`${API_URL}/admin/product-card-badges/definitions/${id}`, {
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

  const performRemoveIcon = async (id: string) => {
    setUploadingId(id);
    try {
      const res = await apiFetch(`${API_URL}/admin/product-card-badges/definitions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ imageUrl: null }),
      });
      if (!res.ok) throw new Error('Не удалось удалить иконку');
      await load();
      showToast('Иконка удалена. Можно загрузить новую.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const deleteConfirmLabel =
    deleteConfirmId !== null
      ? (rows.find((r) => r.id === deleteConfirmId)?.label ?? 'этот бэйдж')
      : '';

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
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Удалить иконку бэйджа"
        message={`Удалить иконку для «${deleteConfirmLabel}»? На сайте перестанет отображаться этот бэйдж, пока не загрузите новое изображение.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) void performRemoveIcon(deleteConfirmId);
        }}
      />
      <section>
        <p className={styles.intro}>
          Загрузите иконки в формате <strong>PNG</strong> (с прозрачным фоном) или JPEG для каждого
          типа бэйджа и при необходимости укажите описание — оно показывается покупателю при
          наведении на бэйдж. На карточке товара (слева от фото) отображаются только выбранные для
          товара бэйджи с загруженным изображением (не более 5 на товар — задаётся в карточке
          товара). Новый файл при загрузке подменяет текущую иконку; крестик на превью очищает слот
          — после этого можно снова загрузить картинку.
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
              <div className={styles.thumbCol}>
                <div
                  className={`${styles.thumbWrap} ${row.imageUrl ? styles.thumbWrapHasImage : ''}`}
                >
                  {row.imageUrl ? (
                    <>
                      <img src={publicUploadUrl(row.imageUrl)} alt="" className={styles.thumbImg} />
                      <button
                        type="button"
                        className={styles.thumbRemoveOverlay}
                        title="Удалить иконку"
                        aria-label={`Удалить иконку: ${row.label}`}
                        disabled={uploadingId !== null}
                        onClick={() => setDeleteConfirmId(row.id)}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className={styles.thumbEmpty}>нет</span>
                  )}
                </div>
                <label
                  className={`${styles.uploadLabel} ${uploadingId === row.id ? styles.uploadLabelWait : ''}`}
                >
                  <span className={styles.uploadBtn}>
                    {uploadingId === row.id
                      ? '…'
                      : row.imageUrl
                        ? 'Заменить файл'
                        : 'Загрузить PNG / JPG'}
                  </span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    className={styles.fileInput}
                    disabled={uploadingId !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleUpload(row.id, f);
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
