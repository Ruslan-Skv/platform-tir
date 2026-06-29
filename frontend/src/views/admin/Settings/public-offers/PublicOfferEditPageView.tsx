'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  createAdminPublicOffer,
  getAdminPublicOffer,
  updateAdminPublicOffer,
  uploadAdminPublicOfferPdf,
} from '@/shared/api/public-offer';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type PublicOfferScopeInfo,
  type PublicOfferScopeType,
  publicOfferPath,
} from '@/shared/lib/legal/public-offer';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { QuizAdminFileUpload } from '@/views/admin/Quiz/ui/QuizAdminFileUpload';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './PublicOfferEditPageView.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type CategoryOption = { id: string; name: string };

type FormState = {
  slug: string;
  pageTitle: string;
  name: string;
  offerUrl: string;
  offerContent: string;
  acceptText: string;
  isPublished: boolean;
  isDefault: boolean;
  sortOrder: number;
  allProducts: boolean;
  allServices: boolean;
  productCategoryIds: string[];
  serviceCategoryIds: string[];
};

const EMPTY_FORM: FormState = {
  slug: '',
  pageTitle: 'Публичная оферта',
  name: 'Публичная оферта',
  offerUrl: '',
  offerContent: '',
  acceptText: 'Я принимаю условия публичной оферты',
  isPublished: false,
  isDefault: false,
  sortOrder: 0,
  allProducts: true,
  allServices: true,
  productCategoryIds: [],
  serviceCategoryIds: [],
};

function scopesToForm(
  scopes: PublicOfferScopeInfo[] | undefined
): Pick<FormState, 'allProducts' | 'allServices' | 'productCategoryIds' | 'serviceCategoryIds'> {
  return {
    allProducts: scopes?.some((scope) => scope.scopeType === 'ALL_PRODUCTS') ?? false,
    allServices: scopes?.some((scope) => scope.scopeType === 'ALL_SERVICES') ?? false,
    productCategoryIds:
      scopes
        ?.filter((scope) => scope.scopeType === 'PRODUCT_CATEGORY' && scope.scopeId)
        .map((scope) => scope.scopeId!) ?? [],
    serviceCategoryIds:
      scopes
        ?.filter((scope) => scope.scopeType === 'SERVICE_CATEGORY' && scope.scopeId)
        .map((scope) => scope.scopeId!) ?? [],
  };
}

function formToScopes(form: FormState): PublicOfferScopeInfo[] {
  const scopes: PublicOfferScopeInfo[] = [];
  if (form.allProducts) {
    scopes.push({ scopeType: 'ALL_PRODUCTS', scopeId: null });
  }
  if (form.allServices) {
    scopes.push({ scopeType: 'ALL_SERVICES', scopeId: null });
  }
  for (const scopeId of form.productCategoryIds) {
    scopes.push({ scopeType: 'PRODUCT_CATEGORY' as PublicOfferScopeType, scopeId });
  }
  for (const scopeId of form.serviceCategoryIds) {
    scopes.push({ scopeType: 'SERVICE_CATEGORY' as PublicOfferScopeType, scopeId });
  }
  return scopes;
}

function getAdminAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

type PublicOfferEditPageViewProps = {
  offerId?: string;
};

export function PublicOfferEditPageView({ offerId }: PublicOfferEditPageViewProps) {
  const router = useRouter();
  const isNew = !offerId;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [productCategories, setProductCategories] = useState<CategoryOption[]>([]);
  const [serviceCategories, setServiceCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [currentOfferId, setCurrentOfferId] = useState(offerId ?? '');
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const loadMeta = useCallback(async () => {
    const [productRes, serviceRes] = await Promise.all([
      apiFetch(`${API_URL}/categories/flat`, { headers: getAdminAuthHeaders() }),
      apiFetch(`${API_URL}/admin/service-catalog/categories?includeInactive=true`, {
        headers: getAdminAuthHeaders(),
      }),
    ]);
    if (productRes.ok) {
      const data = (await productRes.json()) as CategoryOption[];
      setProductCategories(data);
    }
    if (serviceRes.ok) {
      const data = (await serviceRes.json()) as CategoryOption[];
      setServiceCategories(data);
    }
  }, []);

  const loadOffer = useCallback(async () => {
    if (!offerId) return;
    const data = await getAdminPublicOffer(offerId);
    setCurrentOfferId(data.id);
    setForm({
      slug: data.slug,
      pageTitle: data.pageTitle,
      name: data.name,
      offerUrl: data.offerUrl ?? '',
      offerContent: data.offerContent ?? '',
      acceptText: data.acceptText,
      isPublished: data.isPublished,
      isDefault: data.isDefault ?? false,
      sortOrder: data.sortOrder ?? 0,
      ...scopesToForm(data.scopes),
    });
  }, [offerId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    loadOffer()
      .catch((err) => {
        console.error(err);
        showSaveError('Не удалось загрузить оферту');
      })
      .finally(() => setLoading(false));
  }, [isNew, loadOffer, showSaveError]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (key: 'productCategoryIds' | 'serviceCategoryIds', id: string) => {
    setForm((prev) => {
      const selected = new Set(prev[key]);
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      return { ...prev, [key]: [...selected] };
    });
  };

  const previewPath = useMemo(() => {
    if (!form.slug.trim()) return null;
    return publicOfferPath(form.slug.trim());
  }, [form.slug]);

  const buildPayload = () => ({
    slug: form.slug.trim(),
    pageTitle: form.pageTitle.trim(),
    name: form.name.trim(),
    offerUrl: form.offerUrl.trim() || null,
    offerContent: form.offerContent.trim() || null,
    acceptText: form.acceptText.trim(),
    isPublished: form.isPublished,
    isDefault: form.isDefault,
    sortOrder: form.sortOrder,
    scopes: formToScopes(form),
  });

  const ensureOfferSaved = async (): Promise<string> => {
    if (!form.slug.trim() || !form.pageTitle.trim() || !form.name.trim()) {
      throw new Error('Заполните slug, заголовок и название перед загрузкой PDF');
    }

    const payload = buildPayload();

    if (currentOfferId) {
      await updateAdminPublicOffer(currentOfferId, payload);
      return currentOfferId;
    }

    const created = await createAdminPublicOffer(payload);
    setCurrentOfferId(created.id);
    router.replace(`/admin/settings/public-offers/${created.id}`);
    return created.id;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    resetSaveFeedback();
    try {
      if (isNew && !currentOfferId) {
        const created = await createAdminPublicOffer(buildPayload());
        setCurrentOfferId(created.id);
        showSaveSuccess();
        router.replace(`/admin/settings/public-offers/${created.id}`);
        return;
      }

      await updateAdminPublicOffer(currentOfferId, buildPayload());
      showSaveSuccess();
      await loadOffer();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingPdf(true);
    resetSaveFeedback();
    try {
      const id = await ensureOfferSaved();
      const { offerUrl } = await uploadAdminPublicOfferPdf(id, file);
      updateField('offerUrl', offerUrl);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка загрузки PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  if (loading) {
    return (
      <SettingsSubPageView title={isNew ? 'Новая оферта' : 'Редактирование оферты'}>
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title={isNew ? 'Новая оферта' : 'Редактирование оферты'}
      subtitle="Загрузите PDF договора или вставьте текст. Назначьте области применения по категориям товаров и услуг."
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button
          data-admin-mutation
          type="submit"
          form="public-offer-form"
          disabled={saving}
          className={styles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        <Link href="/admin/settings/public-offers">← К списку оферт</Link>
        {previewPath ? (
          <>
            {' · '}
            <Link href={previewPath} target="_blank" rel="noopener noreferrer">
              {previewPath}
            </Link>
          </>
        ) : null}
      </p>

      <form id="public-offer-form" onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Slug (URL)</span>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
            placeholder="doors-installation"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </label>

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
          <span>Краткое название (для списка и чекбокса)</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Порядок сортировки</span>
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)}
          />
        </label>

        <div className={styles.documentSection}>
          <h3 className={styles.documentTitle}>Документ оферты</h3>
          <p className={styles.documentHint}>
            Рекомендуется загрузить PDF. Если оферта ещё не сохранена, она будет создана
            автоматически при загрузке файла.
          </p>

          <label className={styles.field}>
            <span>PDF оферты</span>
            <QuizAdminFileUpload
              url={form.offerUrl || null}
              onUrlChange={(value) => updateField('offerUrl', value)}
              onFileSelect={handleUploadPdf}
              uploading={uploadingPdf}
              accept=".pdf,application/pdf"
              uploadLabel="Загрузить PDF"
              placeholder="/uploads/offer/offer-….pdf"
              emptyHint="PDF не загружен"
            />
          </label>

          <label className={styles.field}>
            <span>Текст оферты (если без PDF)</span>
            <textarea
              value={form.offerContent}
              onChange={(e) => updateField('offerContent', e.target.value)}
              rows={12}
              placeholder="Вставьте текст публичной оферты…"
            />
          </label>
        </div>

        <div className={styles.scopesSection}>
          <h3 className={styles.scopesTitle}>Область применения</h3>
          <p className={styles.scopesHint}>
            Оферта показывается в корзине и при оформлении, если в заказе есть товары или услуги из
            выбранных областей. Если совпадений нет — применяется оферта «по умолчанию».
          </p>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={form.allProducts}
              onChange={(e) => updateField('allProducts', e.target.checked)}
            />
            <span>Все товары каталога</span>
          </label>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={form.allServices}
              onChange={(e) => updateField('allServices', e.target.checked)}
            />
            <span>Все услуги</span>
          </label>

          {productCategories.length > 0 ? (
            <div className={styles.categoryGroup}>
              <span className={styles.categoryGroupTitle}>Категории товаров</span>
              <div className={styles.categoryList}>
                {productCategories.map((category) => (
                  <label key={category.id} className={styles.categoryItem}>
                    <input
                      type="checkbox"
                      checked={form.productCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory('productCategoryIds', category.id)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {serviceCategories.length > 0 ? (
            <div className={styles.categoryGroup}>
              <span className={styles.categoryGroupTitle}>Категории услуг</span>
              <div className={styles.categoryList}>
                {serviceCategories.map((category) => (
                  <label key={category.id} className={styles.categoryItem}>
                    <input
                      type="checkbox"
                      checked={form.serviceCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory('serviceCategoryIds', category.id)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <label className={styles.field}>
          <span>Текст чекбокса в корзине и при оформлении</span>
          <input
            type="text"
            value={form.acceptText}
            onChange={(e) => updateField('acceptText', e.target.value)}
            placeholder="Я принимаю условия оферты на установку дверей"
            required
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
          />
          <span>Оферта по умолчанию (если нет совпадений по категориям)</span>
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => updateField('isPublished', e.target.checked)}
          />
          <span>Показывать на публичном сайте (нужен PDF или текст оферты)</span>
        </label>
      </form>
    </SettingsSubPageView>
  );
}
