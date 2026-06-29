'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL, EMPTY_NEW_LINK } from '../footer-section-page.constants';
import type { FooterData, FooterSectionData, PageMessage } from '../footer-section-page.types';

function normalizeFooterSection(section: FooterSectionData): FooterSectionData {
  return {
    ...section,
    links: section.links ?? [],
  };
}

function normalizeFooterData(data: FooterData): FooterData {
  return {
    ...data,
    sections: data.sections.map(normalizeFooterSection),
  };
}

export function useFooterSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<FooterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newLink, setNewLink] = useState(EMPTY_NEW_LINK);
  const [addingLinkToSection, setAddingLinkToSection] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_URL}/admin/home/footer`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setData(normalizeFooterData(d));
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
  }, [getAuthHeaders, showMessage]);

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
      const res = await apiFetch(`${API_URL}/admin/home/footer`, {
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
      const res = await apiFetch(`${API_URL}/admin/home/footer/vk-icon`, {
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
      const res = await apiFetch(`${API_URL}/admin/home/footer/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: newSectionTitle.trim() }),
      });
      if (res.ok) {
        const section = normalizeFooterSection(await res.json());
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
      const res = await apiFetch(`${API_URL}/admin/home/footer/sections/${id}`, {
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
      const res = await apiFetch(`${API_URL}/admin/home/footer/sections/${id}`, {
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
      const res = await apiFetch(`${API_URL}/admin/home/footer/sections/${sectionId}/links`, {
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
                        links: [...(s.links ?? []), link].sort((a, b) => a.sortOrder - b.sortOrder),
                      }
                    : s
                ),
              }
            : prev
        );
        setNewLink(EMPTY_NEW_LINK);
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
      const res = await apiFetch(
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
                        links: (s.links ?? []).map((l) =>
                          l.id === linkId ? { ...l, name, href } : l
                        ),
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
      const res = await apiFetch(
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
                  s.id === sectionId
                    ? { ...s, links: (s.links ?? []).filter((l) => l.id !== linkId) }
                    : s
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

  return {
    data,
    setData,
    loading,
    saving,
    message,
    editingSection,
    setEditingSection,
    editingLink,
    setEditingLink,
    newSectionTitle,
    setNewSectionTitle,
    newLink,
    setNewLink,
    addingLinkToSection,
    setAddingLinkToSection,
    uploadingIcon,
    fileInputRef,
    handleSaveBlock,
    handleUploadVkIcon,
    handleBlockChange,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleAddLink,
    handleUpdateLink,
    handleDeleteLink,
  };
}

export type FooterSectionPageModel = ReturnType<typeof useFooterSectionPage>;
