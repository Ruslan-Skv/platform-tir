'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './SupplierEditPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Supplier {
  id: string;
  legalName: string;
  commercialName?: string | null;
  website?: string | null;
  legalAddress?: string | null;
  inn?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankBik?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
}

interface SupplierEditPageProps {
  supplierId?: string;
}

export function SupplierEditPage({ supplierId }: SupplierEditPageProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const isEditMode = !!supplierId;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    legalName: '',
    commercialName: '',
    website: '',
    legalAddress: '',
    inn: '',
    bankName: '',
    bankAccount: '',
    bankBik: '',
    email: '',
    phones: [] as string[], // Массив телефонов
    isActive: true,
  });

  // Fetch supplier data for edit mode
  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/catalog/suppliers/${supplierId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Поставщик не найден');
        } else {
          setError('Ошибка загрузки поставщика');
        }
        return;
      }

      const data = await response.json();

      // Обработка телефонов: может быть массивом или строкой (для обратной совместимости)
      let phones: string[] = [];
      if (Array.isArray(data.phone)) {
        phones = data.phone.filter((p) => p && p.trim());
      } else if (data.phone && typeof data.phone === 'string') {
        phones = [data.phone];
      }

      setFormData({
        legalName: data.legalName || '',
        commercialName: data.commercialName || '',
        website: data.website || '',
        legalAddress: data.legalAddress || '',
        inn: data.inn || '',
        bankName: data.bankName || '',
        bankAccount: data.bankAccount || '',
        bankBik: data.bankBik || '',
        email: data.email || '',
        phones: phones,
        isActive: data.isActive ?? true,
      });
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [supplierId, getAuthHeaders]);

  useEffect(() => {
    if (isEditMode && supplierId) {
      fetchSupplier();
    }
  }, [isEditMode, supplierId, fetchSupplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    // Validate required fields
    if (!formData.legalName.trim()) {
      setError('Наименование юридическое обязательно для заполнения');
      setSaving(false);
      return;
    }

    try {
      const supplierData: Record<string, unknown> = {
        legalName: formData.legalName.trim(),
        isActive: formData.isActive,
      };

      // Add optional fields only if they have values
      if (formData.commercialName.trim()) {
        supplierData.commercialName = formData.commercialName.trim();
      }
      if (formData.website.trim()) {
        supplierData.website = formData.website.trim();
      }
      if (formData.legalAddress.trim()) {
        supplierData.legalAddress = formData.legalAddress.trim();
      }
      if (formData.inn.trim()) {
        supplierData.inn = formData.inn.trim();
      }
      if (formData.bankName.trim()) {
        supplierData.bankName = formData.bankName.trim();
      }
      if (formData.bankAccount.trim()) {
        supplierData.bankAccount = formData.bankAccount.trim();
      }
      if (formData.bankBik.trim()) {
        supplierData.bankBik = formData.bankBik.trim();
      }
      if (formData.email.trim()) {
        supplierData.email = formData.email.trim();
      }
      if (formData.phones.length > 0) {
        supplierData.phone = formData.phones.filter((p) => p.trim()).map((p) => p.trim());
      }

      const url = isEditMode
        ? `${API_URL}/admin/catalog/suppliers/${supplierId}`
        : `${API_URL}/admin/catalog/suppliers`;

      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(supplierData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: isEditMode ? 'Поставщик обновлен' : 'Поставщик создан',
        });
        setTimeout(() => {
          router.push('/admin/catalog/suppliers');
        }, 1500);
      } else {
        let errorData;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        const errorMessage =
          errorData.message ||
          (Array.isArray(errorData)
            ? errorData.map((e: { message?: string }) => e.message).join(', ')
            : '') ||
          errorData.error ||
          JSON.stringify(errorData) ||
          `Ошибка ${isEditMode ? 'обновления' : 'создания'} поставщика (${response.status})`;

        setError(errorMessage);
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка данных поставщика...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isEditMode ? 'Редактирование поставщика' : 'Создание поставщика'}
        </h1>
        <div className={styles.headerActions}>
          {isEditMode && supplierId && (
            <Link
              href={`/admin/crm/supplier-settlements/${supplierId}`}
              className={styles.settlementsLink}
            >
              Расчёты с поставщиком →
            </Link>
          )}
          <button
            className={styles.backButton}
            onClick={() => router.push('/admin/catalog/suppliers')}
          >
            ← Назад к списку
          </button>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {message && (
        <div className={`${styles.messageBox} ${styles[message.type]}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Основная информация */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="legalName">
                Наименование юридическое <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="legalName"
                name="legalName"
                value={formData.legalName}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="ООО «Пример»"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="commercialName">Наименование коммерческое</label>
              <input
                type="text"
                id="commercialName"
                name="commercialName"
                value={formData.commercialName}
                onChange={handleChange}
                className={styles.input}
                placeholder="Пример Торг"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="website">Адрес сайта</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Юридическая информация */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Юридическая информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="legalAddress">Юридический адрес</label>
              <textarea
                id="legalAddress"
                name="legalAddress"
                value={formData.legalAddress}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="г. Москва, ул. Примерная, д. 1"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="inn">ИНН</label>
              <input
                type="text"
                id="inn"
                name="inn"
                value={formData.inn}
                onChange={handleChange}
                className={styles.input}
                placeholder="1234567890"
              />
              <p className={styles.hint}>
                Уникальный идентификатор (ИНН должен быть уникальным для каждого поставщика)
              </p>
            </div>
          </div>

          {/* Банковские реквизиты */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Банковские реквизиты</h2>

            <div className={styles.formGroup}>
              <label htmlFor="bankName">Банк</label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                className={styles.input}
                placeholder="ПАО «Сбербанк»"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankAccount">Расчетный счет (р/сч)</label>
              <input
                type="text"
                id="bankAccount"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                className={styles.input}
                placeholder="40702810100000000000"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bankBik">БИК</label>
              <input
                type="text"
                id="bankBik"
                name="bankBik"
                value={formData.bankBik}
                onChange={handleChange}
                className={styles.input}
                placeholder="044525225"
              />
            </div>
          </div>

          {/* Контактная информация */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Контактная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="info@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Телефоны</label>
              {formData.phones.map((phone, index) => (
                <div key={index} className={styles.phoneRow}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const newPhones = [...formData.phones];
                      newPhones[index] = e.target.value;
                      setFormData({ ...formData, phones: newPhones });
                    }}
                    className={styles.input}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newPhones = formData.phones.filter((_, i) => i !== index);
                      setFormData({ ...formData, phones: newPhones });
                    }}
                    className={styles.removeButton}
                    title="Удалить телефон"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, phones: [...formData.phones, ''] });
                }}
                className={styles.addPhoneButton}
              >
                + Добавить телефон
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className={styles.checkbox}
                />
                <span>Активен</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/admin/catalog/suppliers')}
            disabled={saving}
          >
            Отмена
          </button>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать поставщика'}
          </button>
        </div>
      </form>
    </div>
  );
}
