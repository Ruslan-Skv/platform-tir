'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type PublicOfferVersionSummary,
  createAdminPublicOffer,
  getAdminPublicOffer,
  restoreAdminPublicOfferVersion,
  updateAdminPublicOffer,
  uploadAdminPublicOfferPdf,
} from '@/shared/api/public-offer';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type PublicOfferScopeInfo,
  type PublicOfferScopeType,
  isPublicOfferPdfUrl,
  publicOfferPath,
  resolvePublicOfferEmbedUrl,
} from '@/shared/lib/legal/public-offer';
import { isRichTextEmpty, toRichTextEditorHtml } from '@/shared/lib/sanitize';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { BlogPostEditor } from '@/views/admin/Content/Blog/shared/BlogPostEditor';
import { QuizAdminFileUpload } from '@/views/admin/Quiz/ui/QuizAdminFileUpload';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './PublicOfferEditPageView.module.css';
import { slugifyPublicOfferName } from './public-offer-form.utils';

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
  const [versions, setVersions] = useState<PublicOfferVersionSummary[]>([]);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [currentOfferId, setCurrentOfferId] = useState(offerId ?? '');
  const [autoSlug, setAutoSlug] = useState(isNew);
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

  const loadOffer = useCallback(
    async (idOverride?: string) => {
      const id = idOverride || offerId;
      if (!id) return;
      const data = await getAdminPublicOffer(id);
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
      setVersions(data.versions ?? []);
    },
    [offerId]
  );

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

  const handleNameChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, name: value };
      if (autoSlug) {
        next.slug = slugifyPublicOfferName(value);
      }
      const pageTitleFollowsName =
        !prev.pageTitle || prev.pageTitle === EMPTY_FORM.pageTitle || prev.pageTitle === prev.name;
      if (pageTitleFollowsName) {
        next.pageTitle = value;
      }
      return next;
    });
  };

  const handleSlugChange = (value: string) => {
    setAutoSlug(false);
    updateField('slug', value.toLowerCase());
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
      await loadOffer(id);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка загрузки PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!currentOfferId) return;
    if (
      !window.confirm(
        `Восстановить редакцию №${versionNumber} как текущую? Текущий документ будет сохранён в истории.`
      )
    ) {
      return;
    }
    setRestoringVersion(versionNumber);
    resetSaveFeedback();
    try {
      const data = await restoreAdminPublicOfferVersion(currentOfferId, versionNumber);
      setForm((prev) => ({
        ...prev,
        offerUrl: data.offerUrl ?? '',
        offerContent: data.offerContent ?? '',
      }));
      setVersions(data.versions ?? []);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось восстановить редакцию');
    } finally {
      setRestoringVersion(null);
    }
  };

  const formatVersionDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru-RU');
    } catch {
      return iso;
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
          <span>Название документа *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Договор оферты на установку дверей"
            required
          />
          <p className={styles.fieldHint}>
            Название оферты в списке на /offer и в чекбоксе при оформлении заказа.
          </p>
        </label>

        <label className={styles.field}>
          <span>URL (slug) *</span>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="dogovor-oferty-na-ustanovku-dverey"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <p className={styles.fieldHint}>
            Адрес страницы оферты: /offer/slug. Генерируется автоматически при изменении названия
            документа.
          </p>
        </label>

        <label className={styles.field}>
          <span>Заголовок на странице оферты *</span>
          <input
            type="text"
            value={form.pageTitle}
            onChange={(e) => updateField('pageTitle', e.target.value)}
            placeholder="Публичная оферта на установку дверей"
            required
          />
          <p className={styles.fieldHint}>
            Крупный заголовок (H1) на публичной странице документа. Обычно совпадает с названием
            документа, но можно сформулировать подробнее.
          </p>
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
            <p className={styles.fieldHint}>
              При загрузке нового PDF текущая редакция автоматически сохраняется в истории — старый
              файл не удаляется.
            </p>
          </label>

          {!isNew && versions.length > 0 ? (
            <div className={styles.versionsBlock}>
              <h4 className={styles.versionsTitle}>История редакций</h4>
              <ul className={styles.versionsList}>
                {versions.map((version) => {
                  const pdfHref =
                    version.offerUrl && isPublicOfferPdfUrl(version.offerUrl)
                      ? resolvePublicOfferEmbedUrl(version.offerUrl)
                      : null;
                  return (
                    <li key={version.id} className={styles.versionsItem}>
                      <div className={styles.versionsMeta}>
                        <strong>Редакция №{version.versionNumber}</strong>
                        <span>{formatVersionDate(version.createdAt)}</span>
                        {version.note ? (
                          <span className={styles.versionsNote}>{version.note}</span>
                        ) : null}
                      </div>
                      <div className={styles.versionsActions}>
                        {pdfHref ? (
                          <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                            Открыть PDF
                          </a>
                        ) : version.hasContent ? (
                          <span>Текст сохранён</span>
                        ) : (
                          <span>Нет файла</span>
                        )}
                        <button
                          type="button"
                          data-modal-btn="secondary"
                          disabled={restoringVersion !== null}
                          onClick={() => void handleRestoreVersion(version.versionNumber)}
                        >
                          {restoringVersion === version.versionNumber
                            ? 'Восстановление…'
                            : 'Сделать текущей'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className={styles.field}>
            <span>Текст оферты (если без PDF)</span>
            <p className={styles.fieldHint}>
              Заголовки (H2–H6) — крупнее и по центру через кнопку «⬌». Абзацы — выравнивание по
              ширине кнопкой «☰».
            </p>
            <BlogPostEditor
              key={currentOfferId || 'new-offer-content'}
              value={toRichTextEditorHtml(form.offerContent)}
              onChange={(html) => {
                updateField('offerContent', isRichTextEmpty(html) ? '' : html);
              }}
              compact
              enableTextAlign
              placeholder="Вставьте текст публичной оферты…"
            />
          </div>
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
            placeholder="Я принимаю условия договора оферты на установку дверей"
            required
          />
          <p className={styles.fieldHint}>
            В тексте можно использовать название документа — оно станет ссылкой на страницу оферты.
          </p>
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
