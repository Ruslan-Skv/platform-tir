'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import styles from './HeroSectionPage.module.css';
import { SectionVisibilityCheckbox } from './SectionVisibilityCheckbox';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

interface AdvantagesBlock {
  title: string;
  subtitle: string;
}

interface AdvantageItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
}

interface AdvantagesData {
  block: AdvantagesBlock;
  items: AdvantageItem[];
}

export function AdvantagesSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<AdvantagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ icon: '', title: '', description: '' });
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null);
  const iconUploadTargetRef = useRef<'new' | string | null>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/admin/home/advantages`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          showMessage('error', 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- загрузка только при монтировании
  }, []);

  const imageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const isIconImageUrl = (icon: string) =>
    !!(icon && typeof icon === 'string' && icon.includes('/uploads/'));

  const handleSaveBlock = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data.block),
      });
      if (res.ok) {
        showMessage('success', 'Изменения успешно сохранены');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockChange = (field: keyof AdvantagesBlock, value: string) => {
    if (!data) return;
    setData({
      ...data,
      block: { ...data.block, [field]: value },
    });
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = iconUploadTargetRef.current;
    if (!file || !target) return;
    setUploadingIcon(target);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items/icon`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const { icon } = await res.json();
        if (target === 'new') {
          setNewItem((p) => ({ ...p, icon }));
        } else {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.map((x) => (x.id === target ? { ...x, icon } : x)),
                }
              : prev
          );
        }
        showMessage('success', 'Иконка загружена');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки иконки');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setUploadingIcon(null);
      iconUploadTargetRef.current = null;
      e.target.value = '';
    }
  };

  const handleAddItem = async () => {
    if (!newItem.icon.trim() || !newItem.title.trim() || !newItem.description.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const item = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: [...prev.items, item].sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : prev
        );
        setNewItem({ icon: '', title: '', description: '' });
        showMessage('success', 'Преимущество добавлено');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateItem = async (id: string, icon: string, title: string, description: string) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ icon, title, description }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((x) =>
                  x.id === id ? { ...x, icon, title, description } : x
                ),
              }
            : prev
        );
        setEditingItem(null);
        showMessage('success', 'Преимущество обновлено');
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Удалить это преимущество?')) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/advantages/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, items: prev.items.filter((x) => x.id !== id) } : prev
        );
        showMessage('success', 'Преимущество удалено');
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    }
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Почему выбирают нас</h1>
        <p className={styles.subtitle}>
          Управление заголовком и преимуществами в секции «Почему выбирают нас» на главной странице.
        </p>
      </header>

      <SectionVisibilityCheckbox
        sectionKey="advantagesVisible"
        sectionLabel="Почему выбирают нас"
      />

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Заголовок секции</h2>
        <div className={styles.formGroup}>
          <label>Заголовок</label>
          <input
            type="text"
            value={data.block.title}
            onChange={(e) => handleBlockChange('title', e.target.value)}
            className={styles.input}
            placeholder="Почему выбирают нас"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.block.subtitle}
            onChange={(e) => handleBlockChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Мы делаем качество доступным"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Преимущества</h2>
        <div className={styles.featuresList}>
          {data.items.map((item) => (
            <div key={item.id} className={styles.featureRow}>
              {editingItem === item.id ? (
                <>
                  <div className={styles.iconCell}>
                    {isIconImageUrl(item.icon) ? (
                      <div className={styles.iconPreview}>
                        <img src={imageUrl(item.icon)} alt="" />
                      </div>
                    ) : (
                      <span className={styles.iconPreview}>{item.icon || '📷'}</span>
                    )}
                    <button
                      type="button"
                      className={styles.iconUploadBtn}
                      onClick={() => {
                        iconUploadTargetRef.current = item.id;
                        iconFileInputRef.current?.click();
                      }}
                      disabled={uploadingIcon === item.id}
                    >
                      {uploadingIcon === item.id ? '...' : 'Загрузить'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.icon}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              items: prev.items.map((x) =>
                                x.id === item.id ? { ...x, icon: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.iconInput}
                    placeholder="Emoji или URL"
                  />
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              items: prev.items.map((x) =>
                                x.id === item.id ? { ...x, title: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.featureInput}
                    placeholder="Заголовок"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              items: prev.items.map((x) =>
                                x.id === item.id ? { ...x, description: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.featureInput}
                    placeholder="Описание"
                  />
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() =>
                      handleUpdateItem(item.id, item.icon, item.title, item.description)
                    }
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => setEditingItem(null)}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  {isIconImageUrl(item.icon) ? (
                    <img src={imageUrl(item.icon)} alt="" className={styles.featureIconImg} />
                  ) : (
                    <span className={styles.featureIcon}>{item.icon}</span>
                  )}
                  <div style={{ flex: 1 }}>
                    <span className={styles.featureTitle}>{item.title}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      {item.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => setEditingItem(item.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={styles.addFeature}>
          <input
            ref={iconFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className={styles.fileInput}
            onChange={handleUploadIcon}
          />
          <div className={styles.iconCell}>
            {isIconImageUrl(newItem.icon) ? (
              <div className={styles.iconPreview}>
                <img src={imageUrl(newItem.icon)} alt="" />
              </div>
            ) : (
              <span className={styles.iconPreview}>{newItem.icon || '📷'}</span>
            )}
            <button
              type="button"
              className={styles.iconUploadBtn}
              onClick={() => {
                iconUploadTargetRef.current = 'new';
                iconFileInputRef.current?.click();
              }}
              disabled={uploadingIcon === 'new'}
            >
              {uploadingIcon === 'new' ? '...' : 'Загрузить'}
            </button>
          </div>
          <input
            type="text"
            value={newItem.icon}
            onChange={(e) => setNewItem((p) => ({ ...p, icon: e.target.value }))}
            className={styles.iconInput}
            placeholder="Emoji или URL"
          />
          <input
            type="text"
            value={newItem.title}
            onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
            className={styles.featureInput}
            placeholder="Заголовок"
          />
          <input
            type="text"
            value={newItem.description}
            onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
            className={styles.featureInput}
            placeholder="Описание"
          />
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddItem}
            disabled={!newItem.icon.trim() || !newItem.title.trim() || !newItem.description.trim()}
          >
            Добавить
          </button>
        </div>
      </section>

      <div className={styles.saveBlock}>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSaveBlock}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  );
}
