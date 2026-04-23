'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import styles from './HeroSectionPage.module.css';
import { SectionVisibilityCheckbox } from './SectionVisibilityCheckbox';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export type HeroSlideShowMode = 'auto' | 'manual' | 'static';

const HERO_SLIDE_SHOW_MODES: { value: HeroSlideShowMode; label: string }[] = [
  { value: 'auto', label: 'Автоматическая смена по таймеру' },
  { value: 'manual', label: 'Только вручную (точки под слайдами)' },
  { value: 'static', label: 'Один слайд без переключения' },
];

interface HeroBlock {
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  slideShowMode?: HeroSlideShowMode;
  slideGap?: number;
}

interface HeroSlide {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

interface HeroFeature {
  id: string;
  icon: string;
  title: string;
  sortOrder: number;
}

interface HeroData {
  block: HeroBlock;
  slides: HeroSlide[];
  features: HeroFeature[];
}

export function HeroSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState({ icon: '', title: '' });
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null);
  const [deletingSlide, setDeletingSlide] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState<string | null>(null);
  const iconUploadTargetRef = useRef<'new' | string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const res = await apiFetch(`${API_URL}/admin/home/hero`, {
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
      const res = await apiFetch(`${API_URL}/admin/home/hero`, {
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

  const handleBlockChange = (
    field: keyof HeroBlock,
    value: string | number | HeroSlideShowMode
  ) => {
    if (!data) return;
    setData({
      ...data,
      block: { ...data.block, [field]: value },
    });
  };

  const handleUploadSlide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/slides`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const slide = await res.json();
        setData((prev) =>
          prev
            ? { ...prev, slides: [...prev.slides, slide].sort((a, b) => a.sortOrder - b.sortOrder) }
            : prev
        );
        showMessage('success', 'Слайд загружен');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSlide = async (id: string) => {
    setDeletingSlide(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/slides/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSlideToDelete(null);
        setData((prev) =>
          prev ? { ...prev, slides: prev.slides.filter((s) => s.id !== id) } : prev
        );
        showMessage('success', 'Слайд удалён');
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    } finally {
      setDeletingSlide(false);
    }
  };

  const handleAddFeature = async () => {
    if (!newFeature.icon.trim() || !newFeature.title.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newFeature),
      });
      if (res.ok) {
        const feature = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                features: [...prev.features, feature].sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : prev
        );
        setNewFeature({ icon: '', title: '' });
        showMessage('success', 'Преимущество добавлено');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateFeature = async (id: string, icon: string, title: string) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ icon, title }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                features: prev.features.map((f) => (f.id === id ? { ...f, icon, title } : f)),
              }
            : prev
        );
        setEditingFeature(null);
        showMessage('success', 'Преимущество обновлено');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleUploadFeatureIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = iconUploadTargetRef.current;
    if (!file || !target) return;
    setUploadingIcon(target);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features/icon`, {
        method: 'POST',
        headers: getAuthHeaders() as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const { icon } = await res.json();
        if (target === 'new') {
          setNewFeature((p) => ({ ...p, icon }));
        } else {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  features: prev.features.map((x) => (x.id === target ? { ...x, icon } : x)),
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

  const handleDeleteFeature = async (id: string) => {
    if (!confirm('Удалить это преимущество?')) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/home/hero/features/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, features: prev.features.filter((f) => f.id !== id) } : prev
        );
        showMessage('success', 'Преимущество удалено');
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
        <h1 className={styles.title}>Первый блок главной страницы</h1>
        <p className={styles.subtitle}>
          Управление текстом, слайд-шоу и преимуществами в блоке Hero на главной странице.
        </p>
      </header>

      <SectionVisibilityCheckbox sectionKey="heroVisible" sectionLabel="Первый блок" />

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      {/* Текст */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Текст блока</h2>
        <div className={styles.formGroup}>
          <label>Заголовок (основная часть)</label>
          <input
            type="text"
            value={data.block.titleMain}
            onChange={(e) => handleBlockChange('titleMain', e.target.value)}
            className={styles.input}
            placeholder="Создаем интерьер мечты"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Заголовок (акцент)</label>
          <input
            type="text"
            value={data.block.titleAccent}
            onChange={(e) => handleBlockChange('titleAccent', e.target.value)}
            className={styles.input}
            placeholder="в Мурманске"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок (описание услуг)</label>
          <textarea
            value={data.block.subtitle}
            onChange={(e) => handleBlockChange('subtitle', e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Мебель на заказ, ремонт под ключ..."
          />
        </div>
      </section>

      {/* Слайд-шоу */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Слайд-шоу (фото готовых работ)</h2>
        <div className={styles.formGroup}>
          <label>Режим слайд-шоу</label>
          <select
            value={data.block.slideShowMode ?? 'auto'}
            onChange={(e) =>
              handleBlockChange('slideShowMode', e.target.value as HeroSlideShowMode)
            }
            className={styles.input}
          >
            {HERO_SLIDE_SHOW_MODES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className={styles.hint}>
            <strong>Авто</strong> — слайды меняются по таймеру. <strong>Вручную</strong> —
            переключение только по клику на точки. <strong>Один слайд</strong> — показывается только
            первый слайд без карусели.
          </p>
        </div>
        <div className={styles.formGroup}>
          <label>Зазор между фотографиями (px)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={data.block.slideGap ?? 16}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              handleBlockChange('slideGap', Number.isNaN(v) ? 16 : Math.max(0, Math.min(100, v)));
            }}
            className={styles.input}
            style={{ maxWidth: 100 }}
          />
          <p className={styles.hint}>От 0 до 100 пикселей. По умолчанию 16.</p>
        </div>
        <p className={styles.hint}>
          Загружайте фотографии готовых работ. Они будут отображаться в режиме слайд-шоу вместо
          заглушки.
        </p>
        <div className={styles.slidesGrid}>
          {data.slides.map((slide) => (
            <div key={slide.id} className={styles.slideCard}>
              <img src={imageUrl(slide.imageUrl)} alt="Слайд" className={styles.slidePreview} />
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => setSlideToDelete(slide.id)}
              >
                Удалить
              </button>
            </div>
          ))}
          <div className={styles.uploadCard}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.fileInput}
              onChange={handleUploadSlide}
            />
            <button
              type="button"
              className={styles.uploadBtn}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Загрузка...' : '+ Добавить фото'}
            </button>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Преимущества (иконки и текст)</h2>
        <div className={styles.featuresList}>
          {data.features.map((f) => (
            <div key={f.id} className={styles.featureRow}>
              {editingFeature === f.id ? (
                <>
                  <div className={styles.iconCell}>
                    {isIconImageUrl(f.icon) ? (
                      <div className={styles.iconPreview}>
                        <img src={imageUrl(f.icon)} alt="" />
                      </div>
                    ) : (
                      <span className={styles.iconPreview}>{f.icon || '📷'}</span>
                    )}
                    <button
                      type="button"
                      className={styles.iconUploadBtn}
                      onClick={() => {
                        iconUploadTargetRef.current = f.id;
                        iconFileInputRef.current?.click();
                      }}
                      disabled={uploadingIcon === f.id}
                    >
                      {uploadingIcon === f.id ? '...' : 'Загрузить'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={f.icon}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              features: prev.features.map((x) =>
                                x.id === f.id ? { ...x, icon: e.target.value } : x
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
                    value={f.title}
                    onChange={(e) =>
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              features: prev.features.map((x) =>
                                x.id === f.id ? { ...x, title: e.target.value } : x
                              ),
                            }
                          : prev
                      )
                    }
                    className={styles.featureInput}
                    placeholder="Текст"
                  />
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => handleUpdateFeature(f.id, f.icon, f.title)}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => setEditingFeature(null)}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  {isIconImageUrl(f.icon) ? (
                    <img src={imageUrl(f.icon)} alt="" className={styles.featureIconImg} />
                  ) : (
                    <span className={styles.featureIcon}>{f.icon}</span>
                  )}
                  <span className={styles.featureTitle}>{f.title}</span>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => setEditingFeature(f.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className={styles.smallBtnDanger}
                    onClick={() => handleDeleteFeature(f.id)}
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
            onChange={handleUploadFeatureIcon}
          />
          <div className={styles.iconCell}>
            {isIconImageUrl(newFeature.icon) ? (
              <div className={styles.iconPreview}>
                <img src={imageUrl(newFeature.icon)} alt="" />
              </div>
            ) : (
              <span className={styles.iconPreview}>{newFeature.icon || '📷'}</span>
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
            value={newFeature.icon}
            onChange={(e) => setNewFeature((p) => ({ ...p, icon: e.target.value }))}
            className={styles.iconInput}
            placeholder="Emoji или URL"
          />
          <input
            type="text"
            value={newFeature.title}
            onChange={(e) => setNewFeature((p) => ({ ...p, title: e.target.value }))}
            className={styles.featureInput}
            placeholder="Текст преимущества"
          />
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddFeature}
            disabled={!newFeature.icon.trim() || !newFeature.title.trim()}
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

      {/* Модалка подтверждения удаления слайда */}
      {slideToDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deletingSlide && setSlideToDelete(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Удалить фото?</h3>
            <p className={styles.modalText}>
              Это фото будет удалено из слайд-шоу первого блока. Действие нельзя отменить.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setSlideToDelete(null)}
                disabled={deletingSlide}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => handleDeleteSlide(slideToDelete)}
                disabled={deletingSlide}
              >
                {deletingSlide ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
