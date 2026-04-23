'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { SectionVisibilityCheckbox } from './SectionVisibilityCheckbox';
import styles from './ServicesSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

interface ServicesBlock {
  title: string;
  subtitle: string;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  imageUrl: string | null;
  sortOrder: number;
}

interface ServicesData {
  block: ServicesBlock;
  items: ServiceItem[];
}

const parseFeatures = (text: string): string[] =>
  text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const formatFeatures = (features: string[]): string => features.join('\n');

export function ServicesSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    features: '',
    price: '',
    imageUrl: '',
  });
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const imageUploadTargetRef = useRef<'new' | string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/admin/home/services`, {
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

  const handleSaveBlock = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services`, {
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

  const handleBlockChange = (field: keyof ServicesBlock, value: string) => {
    if (!data) return;
    setData({
      ...data,
      block: { ...data.block, [field]: value },
    });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = imageUploadTargetRef.current;
    if (!file || !target) return;
    setUploadingImage(target);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items/image`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const { imageUrl: url } = await res.json();
        if (target === 'new') {
          setNewItem((p) => ({ ...p, imageUrl: url }));
        } else {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.map((x) => (x.id === target ? { ...x, imageUrl: url } : x)),
                }
              : prev
          );
        }
        showMessage('success', 'Изображение загружено');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setUploadingImage(null);
      imageUploadTargetRef.current = null;
      e.target.value = '';
    }
  };

  const handleAddItem = async () => {
    const features = parseFeatures(newItem.features);
    if (!newItem.title.trim() || !newItem.description.trim() || !newItem.price.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: newItem.title,
          description: newItem.description,
          features,
          price: newItem.price,
          imageUrl: newItem.imageUrl || undefined,
        }),
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
        setNewItem({ title: '', description: '', features: '', price: '', imageUrl: '' });
        showMessage('success', 'Услуга добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateItem = async (
    id: string,
    item: {
      title: string;
      description: string;
      features: string[];
      price: string;
      imageUrl: string | null;
    }
  ) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((x) => (x.id === id ? { ...x, ...item } : x)),
              }
            : prev
        );
        setEditingItem(null);
        showMessage('success', 'Услуга обновлена');
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Удалить эту услугу?')) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/services/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, items: prev.items.filter((x) => x.id !== id) } : prev
        );
        showMessage('success', 'Услуга удалена');
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
        <h1 className={styles.title}>Комплексные решения</h1>
        <p className={styles.subtitle}>
          Управление заголовком и услугами в секции «Комплексные решения» на главной странице.
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="servicesVisible" sectionLabel="Комплексные решения" />

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
            placeholder="Комплексные решения"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.block.subtitle}
            onChange={(e) => handleBlockChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Полный цикл услуг для вашего комфорта"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Услуги</h2>
        <div className={styles.servicesList}>
          {data.items.map((item) => (
            <div key={item.id} className={styles.serviceCard}>
              {editingItem === item.id ? (
                <div className={styles.serviceCardEdit}>
                  <div className={styles.editGrid}>
                    <div className={styles.editImageColumn}>
                      {item.imageUrl ? (
                        <div className={styles.editImagePreview}>
                          <img src={imageUrl(item.imageUrl)} alt="" />
                        </div>
                      ) : (
                        <div className={styles.serviceImagePlaceholder}>🖼</div>
                      )}
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                        onClick={() => {
                          imageUploadTargetRef.current = item.id;
                          imageFileInputRef.current?.click();
                        }}
                        disabled={uploadingImage === item.id}
                      >
                        {uploadingImage === item.id ? 'Загрузка...' : 'Загрузить фото'}
                      </button>
                    </div>
                    <div className={styles.editFields}>
                      <div className={styles.editField}>
                        <label>Название</label>
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
                          placeholder="Название услуги"
                        />
                      </div>
                      <div className={styles.editField}>
                        <label>Описание</label>
                        <textarea
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
                          placeholder="Описание услуги"
                          rows={3}
                        />
                      </div>
                      <div className={styles.editField}>
                        <label>Особенности (каждая с новой строки или через запятую)</label>
                        <textarea
                          value={formatFeatures(item.features)}
                          onChange={(e) =>
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    items: prev.items.map((x) =>
                                      x.id === item.id
                                        ? { ...x, features: parseFeatures(e.target.value) }
                                        : x
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder={'Дизайн-проект\nЧерновые работы\nЧистовая отделка'}
                          rows={4}
                        />
                      </div>
                      <div className={`${styles.editField} ${styles.editFieldPrice}`}>
                        <label>Цена</label>
                        <input
                          type="text"
                          value={item.price}
                          onChange={(e) =>
                            setData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    items: prev.items.map((x) =>
                                      x.id === item.id ? { ...x, price: e.target.value } : x
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="от 5 000 ₽/м²"
                        />
                      </div>
                    </div>
                  </div>
                  <div className={styles.editButtons}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={() =>
                        handleUpdateItem(item.id, {
                          title: item.title,
                          description: item.description,
                          features: item.features,
                          price: item.price,
                          imageUrl: item.imageUrl,
                        })
                      }
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => setEditingItem(null)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.serviceCardView}>
                  <div>
                    {item.imageUrl ? (
                      <div className={styles.serviceImage}>
                        <img src={imageUrl(item.imageUrl)} alt="" />
                      </div>
                    ) : (
                      <div className={styles.serviceImagePlaceholder}>🖼</div>
                    )}
                  </div>
                  <div className={styles.serviceContent}>
                    <h3 className={styles.serviceTitle}>{item.title}</h3>
                    <p className={styles.serviceDescription}>{item.description}</p>
                    {item.features.length > 0 && (
                      <div className={styles.serviceFeatures}>
                        {item.features.map((feature, idx) => (
                          <span key={idx} className={styles.serviceFeature}>
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className={styles.servicePrice}>{item.price}</p>
                  </div>
                  <div className={styles.serviceActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => setEditingItem(item.id)}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.addForm}>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.fileInput}
            onChange={handleUploadImage}
          />
          <h3 className={styles.addFormTitle}>Добавить новую услугу</h3>
          <div className={styles.addFormGrid}>
            <div className={styles.editImageColumn}>
              {newItem.imageUrl ? (
                <div className={styles.editImagePreview}>
                  <img src={imageUrl(newItem.imageUrl)} alt="" />
                </div>
              ) : (
                <div className={styles.serviceImagePlaceholder}>🖼</div>
              )}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                onClick={() => {
                  imageUploadTargetRef.current = 'new';
                  imageFileInputRef.current?.click();
                }}
                disabled={uploadingImage === 'new'}
              >
                {uploadingImage === 'new' ? 'Загрузка...' : 'Загрузить фото'}
              </button>
            </div>
            <div className={styles.addFormFields}>
              <div className={styles.addFormField}>
                <label>Название</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Название услуги"
                />
              </div>
              <div className={styles.addFormField}>
                <label>Описание</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Описание услуги"
                  rows={3}
                />
              </div>
              <div className={styles.addFormField}>
                <label>Особенности (каждая с новой строки или через запятую)</label>
                <textarea
                  value={newItem.features}
                  onChange={(e) => setNewItem((p) => ({ ...p, features: e.target.value }))}
                  placeholder={'Дизайн-проект\nЧерновые работы\nЧистовая отделка'}
                  rows={4}
                />
              </div>
              <div className={`${styles.addFormField} ${styles.addFormFieldPrice}`}>
                <label>Цена</label>
                <input
                  type="text"
                  value={newItem.price}
                  onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                  placeholder="от 5 000 ₽/м²"
                />
              </div>
            </div>
          </div>
          <div className={styles.addFormButtons}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={handleAddItem}
              disabled={
                !newItem.title.trim() || !newItem.description.trim() || !newItem.price.trim()
              }
            >
              Добавить услугу
            </button>
          </div>
        </div>
      </section>

      <div className={styles.saveBlock}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleSaveBlock}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения заголовка'}
        </button>
      </div>
    </div>
  );
}
