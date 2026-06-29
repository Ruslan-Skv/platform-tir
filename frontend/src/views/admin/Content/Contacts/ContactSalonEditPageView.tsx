'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  createAdminContactSalon,
  getAdminContactSalon,
  updateAdminContactSalon,
  uploadContactSalonImage,
} from '@/shared/api/contacts';
import type { ContactSalonManagerInput } from '@/shared/lib/contacts';
import { getContactImageUrl } from '@/shared/lib/contacts';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './ContactsAdminPage.module.css';

type ManagerFormRow = ContactSalonManagerInput & { key: string };

type FormState = {
  name: string;
  address: string;
  phone: string;
  imageUrl: string;
  sortOrder: number;
  isPublished: boolean;
  managers: ManagerFormRow[];
};

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  phone: '',
  imageUrl: '',
  sortOrder: 0,
  isPublished: true,
  managers: [],
};

function createManagerRow(partial?: Partial<ContactSalonManagerInput>): ManagerFormRow {
  return {
    key: `mgr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: partial?.name ?? '',
    phone: partial?.phone ?? '',
    email: partial?.email ?? '',
    sortOrder: partial?.sortOrder ?? 0,
  };
}

type ContactSalonEditPageViewProps = {
  salonId?: string;
};

export function ContactSalonEditPageView({ salonId }: ContactSalonEditPageViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNew = !salonId;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    if (!salonId) return;
    const data = await getAdminContactSalon(salonId);
    setForm({
      name: data.name,
      address: data.address,
      phone: data.phone ?? '',
      imageUrl: data.imageUrl ?? '',
      sortOrder: data.sortOrder,
      isPublished: data.isPublished,
      managers: data.managers.map((m) =>
        createManagerRow({
          name: m.name,
          phone: m.phone ?? '',
          email: m.email ?? '',
          sortOrder: m.sortOrder,
        })
      ),
    });
  }, [salonId]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    load()
      .catch(() => showSaveError('Не удалось загрузить салон'))
      .finally(() => setLoading(false));
  }, [isNew, load, showSaveError]);

  const updateField = <K extends keyof Omit<FormState, 'managers'>>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateManager = (key: string, patch: Partial<ContactSalonManagerInput>) => {
    setForm((prev) => ({
      ...prev,
      managers: prev.managers.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    }));
  };

  const addManager = () => {
    setForm((prev) => ({
      ...prev,
      managers: [...prev.managers, createManagerRow({ sortOrder: prev.managers.length })],
    }));
  };

  const removeManager = (key: string) => {
    setForm((prev) => ({
      ...prev,
      managers: prev.managers.filter((m) => m.key !== key),
    }));
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    resetSaveFeedback();
    try {
      const { imageUrl } = await uploadContactSalonImage(file);
      updateField('imageUrl', imageUrl);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    resetSaveFeedback();
    try {
      const managers = form.managers
        .filter((m) => m.name.trim())
        .map((m, index) => ({
          name: m.name.trim(),
          phone: m.phone?.trim() || null,
          email: m.email?.trim() || null,
          sortOrder: m.sortOrder ?? index,
        }));

      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        sortOrder: form.sortOrder,
        isPublished: form.isPublished,
        managers,
      };

      if (isNew) {
        const created = await createAdminContactSalon(payload);
        showSaveSuccess();
        router.replace(`/admin/content/contacts/salons/${created.id}`);
        return;
      }

      await updateAdminContactSalon(salonId!, payload);
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = getContactImageUrl(form.imageUrl);

  if (loading) {
    return (
      <SettingsSubPageView title={isNew ? 'Новый салон' : 'Редактирование салона'}>
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title={isNew ? 'Новый салон' : 'Редактирование салона'}
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button
          data-admin-mutation
          type="submit"
          form="contact-salon-form"
          disabled={saving}
          className={styles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        <Link href="/admin/content/contacts">← К списку салонов</Link>
      </p>

      <form id="contact-salon-form" onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Название салона *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Салон на Ленина"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Адрес *</span>
          <textarea
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            rows={3}
            placeholder="г. Мурманск, ул. …"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Телефон салона</span>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="8 (8152) 60-12-70"
          />
        </label>

        <div className={styles.imageField}>
          <span className={styles.field}>Фото салона</span>
          {previewUrl ? (
            <div className={styles.imagePreview}>
              <img src={previewUrl} alt={form.name || 'Превью'} />
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageSelect}
            hidden
          />
          <button
            data-admin-mutation
            type="button"
            className={styles.uploadButton}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Загрузка...' : previewUrl ? 'Заменить фото' : 'Загрузить фото'}
          </button>
          {previewUrl ? (
            <button
              data-admin-mutation
              type="button"
              className={styles.deleteButton}
              onClick={() => updateField('imageUrl', '')}
            >
              Удалить фото
            </button>
          ) : null}
        </div>

        <section className={styles.managersSection}>
          <div className={styles.managersHeader}>
            <h3>Менеджеры</h3>
            <button
              data-admin-mutation
              type="button"
              className={styles.addManagerButton}
              onClick={addManager}
            >
              + Добавить менеджера
            </button>
          </div>
          {form.managers.length === 0 ? (
            <p className={styles.empty}>Менеджеры не добавлены.</p>
          ) : (
            form.managers.map((manager, index) => (
              <div key={manager.key} className={styles.managerCard}>
                <div className={styles.managerCardHeader}>
                  <p className={styles.managerCardTitle}>Менеджер {index + 1}</p>
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.removeManagerButton}
                    onClick={() => removeManager(manager.key)}
                  >
                    Удалить
                  </button>
                </div>
                <label className={styles.field}>
                  <span>Имя *</span>
                  <input
                    type="text"
                    value={manager.name}
                    onChange={(e) => updateManager(manager.key, { name: e.target.value })}
                    placeholder="Иванова Мария"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Телефон</span>
                  <input
                    type="text"
                    value={manager.phone ?? ''}
                    onChange={(e) => updateManager(manager.key, { phone: e.target.value })}
                    placeholder="8 (9xx) xxx-xx-xx"
                  />
                </label>
                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={manager.email ?? ''}
                    onChange={(e) => updateManager(manager.key, { email: e.target.value })}
                    placeholder="manager@example.ru"
                  />
                </label>
              </div>
            ))
          )}
        </section>

        <label className={styles.field}>
          <span>Порядок сортировки</span>
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)}
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => updateField('isPublished', e.target.checked)}
          />
          <span>Показывать на сайте</span>
        </label>
      </form>
    </SettingsSubPageView>
  );
}
