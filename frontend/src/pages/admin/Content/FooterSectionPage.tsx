'use client';

import React, { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './FooterSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface FooterLink {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}

interface FooterSectionData {
  id: string;
  title: string;
  links: FooterLink[];
  sortOrder: number;
}

interface FooterBlock {
  workingHours: { weekdays: string; saturday: string; sunday: string };
  phone: string;
  email: string;
  developer: string;
  copyrightCompanyName: string;
  socialLinks: {
    vk: { name: string; href: string; icon: string; ariaLabel: string };
  };
}

interface FooterData {
  block: FooterBlock;
  sections: FooterSectionData[];
}

export function FooterSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<FooterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newLink, setNewLink] = useState({ name: '', href: '' });
  const [addingLinkToSection, setAddingLinkToSection] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/home/footer`, {
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
  }, [getAuthHeaders]);

  const handleSaveBlock = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const payload = {
        workingHoursWeekdays: data.block.workingHours.weekdays,
        workingHoursSaturday: data.block.workingHours.saturday,
        workingHoursSunday: data.block.workingHours.sunday,
        phone: data.block.phone,
        email: data.block.email,
        developer: data.block.developer,
        copyrightCompanyName: data.block.copyrightCompanyName,
        vkHref: data.block.socialLinks.vk.href,
        vkIcon: data.block.socialLinks.vk.icon,
      };
      const res = await fetch(`${API_URL}/admin/home/footer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
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

  const handleUploadVkIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/admin/home/footer/vk-icon`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (res.ok) {
        const { vkIcon } = (await res.json()) as { vkIcon: string };
        setData({
          ...data,
          block: {
            ...data.block,
            socialLinks: {
              ...data.block.socialLinks,
              vk: { ...data.block.socialLinks.vk, icon: vkIcon },
            },
          },
        });
        showMessage('success', 'Иконка загружена');
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка загрузки иконки');
      }
    } catch {
      showMessage('error', 'Ошибка загрузки иконки');
    } finally {
      setUploadingIcon(false);
      e.target.value = '';
    }
  };

  const handleBlockChange = (path: string, value: string) => {
    if (!data) return;
    if (path.startsWith('workingHours.')) {
      const key = path.replace('workingHours.', '') as 'weekdays' | 'saturday' | 'sunday';
      setData({
        ...data,
        block: {
          ...data.block,
          workingHours: { ...data.block.workingHours, [key]: value },
        },
      });
    } else if (path === 'socialLinks.vk.href' || path === 'socialLinks.vk.icon') {
      const key = path.replace('socialLinks.vk.', '') as 'href' | 'icon';
      setData({
        ...data,
        block: {
          ...data.block,
          socialLinks: {
            ...data.block.socialLinks,
            vk: { ...data.block.socialLinks.vk, [key]: value },
          },
        },
      });
    } else {
      setData({
        ...data,
        block: { ...data.block, [path]: value },
      });
    }
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/home/footer/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: newSectionTitle.trim() }),
      });
      if (res.ok) {
        const section = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                sections: [...prev.sections, section].sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : prev
        );
        setNewSectionTitle('');
        showMessage('success', 'Секция добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateSection = async (id: string, title: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/home/footer/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) => (s.id === id ? { ...s, title } : s)),
              }
            : prev
        );
        setEditingSection(null);
        showMessage('success', 'Секция обновлена');
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Удалить эту секцию и все её ссылки?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/home/footer/sections/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, sections: prev.sections.filter((s) => s.id !== id) } : prev
        );
        showMessage('success', 'Секция удалена');
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    }
  };

  const handleAddLink = async (sectionId: string) => {
    if (!newLink.name.trim() || !newLink.href.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/home/footer/sections/${sectionId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newLink),
      });
      if (res.ok) {
        const link = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        links: [...s.links, link].sort((a, b) => a.sortOrder - b.sortOrder),
                      }
                    : s
                ),
              }
            : prev
        );
        setNewLink({ name: '', href: '' });
        setAddingLinkToSection(null);
        showMessage('success', 'Ссылка добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateLink = async (
    sectionId: string,
    linkId: string,
    name: string,
    href: string
  ) => {
    try {
      const res = await fetch(
        `${API_URL}/admin/home/footer/sections/${sectionId}/links/${linkId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ name, href }),
        }
      );
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        links: s.links.map((l) => (l.id === linkId ? { ...l, name, href } : l)),
                      }
                    : s
                ),
              }
            : prev
        );
        setEditingLink(null);
        showMessage('success', 'Ссылка обновлена');
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDeleteLink = async (sectionId: string, linkId: string) => {
    if (!confirm('Удалить эту ссылку?')) return;
    try {
      const res = await fetch(
        `${API_URL}/admin/home/footer/sections/${sectionId}/links/${linkId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === sectionId ? { ...s, links: s.links.filter((l) => l.id !== linkId) } : s
                ),
              }
            : prev
        );
        showMessage('success', 'Ссылка удалена');
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
        <h1 className={styles.title}>Футер</h1>
        <p className={styles.subtitle}>
          Управление контактами, секциями и ссылками в футере сайта.
        </p>
      </header>

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Контакты и режим работы</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Телефон</label>
            <input
              type="text"
              value={data.block.phone}
              onChange={(e) => handleBlockChange('phone', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="text"
              value={data.block.email}
              onChange={(e) => handleBlockChange('email', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Режим работы (пн-пт)</label>
            <input
              type="text"
              value={data.block.workingHours.weekdays}
              onChange={(e) => handleBlockChange('workingHours.weekdays', e.target.value)}
              className={styles.input}
              placeholder="пн-пт: 11-19"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Режим работы (сб)</label>
            <input
              type="text"
              value={data.block.workingHours.saturday}
              onChange={(e) => handleBlockChange('workingHours.saturday', e.target.value)}
              className={styles.input}
              placeholder="сб: 12-16"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Режим работы (вс)</label>
            <input
              type="text"
              value={data.block.workingHours.sunday}
              onChange={(e) => handleBlockChange('workingHours.sunday', e.target.value)}
              className={styles.input}
              placeholder="вс: выходной"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Нижняя часть и соцсети</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Название компании (в копирайте)</label>
            <input
              type="text"
              value={data.block.copyrightCompanyName}
              onChange={(e) => handleBlockChange('copyrightCompanyName', e.target.value)}
              className={styles.input}
              placeholder="Территория интерьерных решений"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Разработчик сайта</label>
            <input
              type="text"
              value={data.block.developer}
              onChange={(e) => handleBlockChange('developer', e.target.value)}
              className={styles.input}
              placeholder="ИП Сквиря Р.В."
            />
          </div>
          <div className={styles.formGroup}>
            <label>Ссылка ВКонтакте</label>
            <input
              type="text"
              value={data.block.socialLinks.vk.href}
              onChange={(e) => handleBlockChange('socialLinks.vk.href', e.target.value)}
              className={styles.input}
              placeholder="https://vk.com/..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>Иконка ВКонтакте</label>
            <div className={styles.iconUploadRow}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleUploadVkIcon}
                className={styles.hiddenFileInput}
                disabled={uploadingIcon}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingIcon}
              >
                {uploadingIcon ? 'Загрузка...' : 'Загрузить иконку'}
              </button>
              {data.block.socialLinks.vk.icon && (
                <div className={styles.iconPreview}>
                  <img
                    src={
                      data.block.socialLinks.vk.icon.startsWith('http')
                        ? data.block.socialLinks.vk.icon
                        : data.block.socialLinks.vk.icon.startsWith('/uploads/')
                          ? `${API_URL.replace(/\/api\/v1$/, '')}${data.block.socialLinks.vk.icon}`
                          : data.block.socialLinks.vk.icon
                    }
                    alt="Иконка ВК"
                    className={styles.iconPreviewImg}
                  />
                </div>
              )}
            </div>
            <input
              type="text"
              value={data.block.socialLinks.vk.icon}
              onChange={(e) => handleBlockChange('socialLinks.vk.icon', e.target.value)}
              className={styles.input}
              placeholder="/images/icons-vk.png или URL"
              style={{ marginTop: 8 }}
            />
          </div>
        </div>
        <div className={styles.saveBlock}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveBlock}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить контакты'}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Секции с ссылками</h2>
        {data.sections.map((section) => (
          <div key={section.id} className={styles.sectionCard}>
            <div className={styles.sectionCardHeader}>
              {editingSection === section.id ? (
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ),
                          }
                        : prev
                    )
                  }
                  className={styles.input}
                  style={{ maxWidth: 200 }}
                  autoFocus
                />
              ) : (
                <h3 className={styles.sectionCardTitle}>{section.title}</h3>
              )}
              <div className={styles.sectionCardActions}>
                {editingSection === section.id ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                      onClick={() => handleUpdateSection(section.id, section.title)}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => setEditingSection(null)}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => setEditingSection(section.id)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
            <ul className={styles.linksList}>
              {section.links.map((link) => (
                <li key={link.id} className={styles.linkRow}>
                  {editingLink === link.id ? (
                    <>
                      <input
                        type="text"
                        value={link.name}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          links: s.links.map((l) =>
                                            l.id === link.id ? { ...l, name: e.target.value } : l
                                          ),
                                        }
                                      : s
                                  ),
                                }
                              : prev
                          )
                        }
                        className={styles.input}
                        placeholder="Название"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={link.href}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          links: s.links.map((l) =>
                                            l.id === link.id ? { ...l, href: e.target.value } : l
                                          ),
                                        }
                                      : s
                                  ),
                                }
                              : prev
                          )
                        }
                        className={styles.input}
                        placeholder="/path или https://..."
                        style={{ flex: 2 }}
                      />
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                        onClick={() => handleUpdateLink(section.id, link.id, link.name, link.href)}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() => setEditingLink(null)}
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={styles.linkName}>{link.name}</span>
                      <span className={styles.linkHref}>{link.href}</span>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() => setEditingLink(link.id)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => handleDeleteLink(section.id, link.id)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {addingLinkToSection === section.id ? (
              <div className={styles.addLinkForm}>
                <input
                  type="text"
                  value={newLink.name}
                  onChange={(e) => setNewLink((p) => ({ ...p, name: e.target.value }))}
                  className={styles.input}
                  placeholder="Название ссылки"
                />
                <input
                  type="text"
                  value={newLink.href}
                  onChange={(e) => setNewLink((p) => ({ ...p, href: e.target.value }))}
                  className={styles.input}
                  placeholder="/path или https://..."
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                  onClick={() => handleAddLink(section.id)}
                >
                  Добавить
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={() => {
                    setAddingLinkToSection(null);
                    setNewLink({ name: '', href: '' });
                  }}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                onClick={() => setAddingLinkToSection(section.id)}
              >
                + Добавить ссылку
              </button>
            )}
          </div>
        ))}
        <div className={styles.addSectionForm}>
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            className={styles.input}
            placeholder="Название новой секции"
            style={{ maxWidth: 300 }}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
            onClick={handleAddSection}
          >
            Добавить секцию
          </button>
        </div>
      </section>
    </div>
  );
}
