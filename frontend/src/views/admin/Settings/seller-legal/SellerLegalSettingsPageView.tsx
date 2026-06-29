'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { getAdminSellerLegal, updateAdminSellerLegal } from '@/shared/api/seller-legal';
import {
  SITE_SELLER_LEGAL_PATH,
  type SellerLegalEntityType,
} from '@/shared/lib/legal/seller-legal';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './SellerLegalSettingsPage.module.css';

type FormState = {
  pageTitle: string;
  legalName: string;
  entityType: SellerLegalEntityType;
  inn: string;
  ogrn: string;
  legalAddress: string;
  phone: string;
  email: string;
  isPublished: boolean;
};

export function SellerLegalSettingsPageView() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    try {
      const data = await getAdminSellerLegal();
      setForm({
        pageTitle: data.pageTitle,
        legalName: data.legalName,
        entityType: data.entityType,
        inn: data.inn,
        ogrn: data.ogrn,
        legalAddress: data.legalAddress,
        phone: data.phone,
        email: data.email,
        isPublished: data.isPublished,
      });
    } catch (err) {
      console.error(err);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    resetSaveFeedback();
    try {
      await updateAdminSellerLegal(form);
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsSubPageView title="Информация о продавце">
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  if (!form) {
    return (
      <SettingsSubPageView title="Информация о продавце">
        <AdminFormMessage type="error">Не удалось загрузить настройки</AdminFormMessage>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title="Информация о продавце"
      subtitle="Обязательные сведения для публичного сайта по закону о защите прав потребителей. Отображаются на странице /legal, в подвале сайта, в корзине и при оформлении заказа."
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button
          data-admin-mutation
          type="submit"
          form="seller-legal-form"
          disabled={saving}
          className={styles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        Публичная страница:{' '}
        <Link href={SITE_SELLER_LEGAL_PATH} target="_blank" rel="noopener noreferrer">
          {SITE_SELLER_LEGAL_PATH}
        </Link>
      </p>

      <form id="seller-legal-form" onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Заголовок страницы</span>
          <input
            type="text"
            value={form.pageTitle}
            onChange={(e) => updateField('pageTitle', e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Полное наименование продавца</span>
          <input
            type="text"
            value={form.legalName}
            onChange={(e) => updateField('legalName', e.target.value)}
            placeholder="Индивидуальный предприниматель ..."
            required
          />
        </label>

        <label className={styles.field}>
          <span>Тип продавца</span>
          <select
            value={form.entityType}
            onChange={(e) => updateField('entityType', e.target.value as SellerLegalEntityType)}
          >
            <option value="IP">Индивидуальный предприниматель (ОГРНИП)</option>
            <option value="UL">Юридическое лицо (ОГРН)</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>ИНН</span>
          <input
            type="text"
            value={form.inn}
            onChange={(e) => updateField('inn', e.target.value)}
            placeholder="Необязательно, но рекомендуется"
          />
        </label>

        <label className={styles.field}>
          <span>{form.entityType === 'UL' ? 'ОГРН' : 'ОГРНИП'}</span>
          <input
            type="text"
            value={form.ogrn}
            onChange={(e) => updateField('ogrn', e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Юридический адрес</span>
          <textarea
            value={form.legalAddress}
            onChange={(e) => updateField('legalAddress', e.target.value)}
            rows={3}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Контактный телефон</span>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => updateField('isPublished', e.target.checked)}
          />
          <span>Показывать на публичном сайте</span>
        </label>
      </form>
    </SettingsSubPageView>
  );
}
