'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';
import { fetchAdminCanvasTypesList } from '@/shared/api/admin-canvas-types';
import { fetchAdminCoatingMaterialsList } from '@/shared/api/admin-coating-materials';
import { fetchAdminDoorThicknessesList } from '@/shared/api/admin-door-thicknesses';
import { fetchAdminManufacturersList } from '@/shared/api/admin-manufacturers';
import { ADMIN_PRODUCTS_LIST_QUERY_KEY } from '@/shared/api/admin-products-list';
import { fetchAdminWeatherstripsList } from '@/shared/api/admin-weatherstrips';
import { getApiErrorMessage, isNetworkFetchError } from '@/shared/lib/api-error';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  CATEGORY_ATTR_SLUG_CANVAS_TYPE,
  CATEGORY_ATTR_SLUG_COATING_MATERIAL,
  CATEGORY_ATTR_SLUG_DOOR_THICKNESS,
  CATEGORY_ATTR_SLUG_MANUFACTURER,
  CATEGORY_ATTR_SLUG_WEATHERSTRIP,
  isCanvasTypeFkCategorySlug,
  isCoatingMaterialFkCategorySlug,
  isDoorThicknessFkCategorySlug,
  isManufacturerFkCategorySlug,
  isWeatherstripFkCategorySlug,
} from './catalog-attribute-fk-slugs';
import { useProductEditSaveButton } from './hooks/useProductEditSaveButton';
import { findInteriorDoorsRootForSelection } from './interior-doors-category-utils';
import { DEFAULT_CARD_SECTIONS, getCardSections } from './product-card-sections';
import {
  PRODUCT_FORM_API_URL,
  PRODUCT_IMAGE_ALLOWED_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE,
} from './product-form-constants';
import { validateAdminProductRequiredFields } from './product-form-required-fields';
import type { ProductCategoryAttribute } from './product-form-types';
import {
  fileToBase64,
  generateSeoDescription,
  generateSeoTitle,
  generateSku,
  transliterate,
} from './product-form-utils';
import { buildProductsListBackUrl } from './products-list-filters-storage';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  onOrder?: boolean;
  categoryId: string;
  category: Category;
  manufacturerId: string | null;
  manufacturer?: { id: string; name: string; slug?: string } | null;
  coatingMaterialId?: string | null;
  coatingMaterial?: { id: string; name: string; slug?: string } | null;
  canvasTypeId?: string | null;
  canvasType?: { id: string; name: string; slug?: string } | null;
  doorThicknessId?: string | null;
  doorThickness?: { id: string; name: string; slug?: string } | null;
  weatherstripId?: string | null;
  weatherstrip?: { id: string; name: string; slug?: string } | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isPartnerProduct?: boolean;
  partnerId?: string | null;
  sortOrder: number;
  images: string[];
  videoUrl?: string | null;
  weight?: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  attributes: Record<string, string> | null;
  sizes?: string[];
  openingSide?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { email: string } | null;
  updatedBy?: { email: string } | null;
  suppliers?: Array<{
    id: string;
    supplierId: string;
    isMainSupplier: boolean;
    supplierSku?: string;
    supplierPrice?: string | number;
    supplierProductUrl?: string | null;
    supplier: {
      id: string;
      legalName: string;
      commercialName?: string | null;
    };
  }>;
  /** Схожие товары в одной карточке (до 5): цена, размер, фото, наименование, цвет, доп. опция */
  cardVariants?: Array<{
    id?: string;
    name: string;
    price: string | number;
    image?: string | null;
    size?: string | null;
    color?: string | null;
    extraOption?: string | null;
    sortOrder?: number;
  }>;
  cardBadgeSelections?: Array<{
    sortOrder: number;
    badgeId: string;
    badge: { id: string; key: string; label: string; imageUrl: string | null };
  }>;
}

interface ParserInfo {
  key: string;
  title: string;
}

interface ProductEditPageProps {
  productId: string;
}

export function useProductEditPage({ productId }: ProductEditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getAuthHeaders, user } = useAuth();
  const getAuthHeadersRef = useRef(getAuthHeaders);
  getAuthHeadersRef.current = getAuthHeaders;
  const fromCategory = searchParams.get('fromCategory') ?? '';
  const navigateBackToProductsList = useCallback(() => {
    router.push(buildProductsListBackUrl(fromCategory));
  }, [router, fromCategory]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nameCopied, setNameCopied] = useState(false);
  const [nameCopyFlashKey, setNameCopyFlashKey] = useState(0);
  const nameCopyTimeoutRef = useRef<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; legalName: string; commercialName?: string | null }>
  >([]);
  const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([]);
  const [manufacturers, setManufacturers] = useState<
    Array<{ id: string; name: string; slug: string; isActive: boolean }>
  >([]);
  const [coatingMaterials, setCoatingMaterials] = useState<
    Array<{ id: string; name: string; slug: string; isActive: boolean }>
  >([]);
  const [canvasTypes, setCanvasTypes] = useState<
    Array<{ id: string; name: string; slug: string; isActive: boolean }>
  >([]);
  const [doorThicknesses, setDoorThicknesses] = useState<
    Array<{ id: string; name: string; slug: string; isActive: boolean }>
  >([]);
  const [weatherstrips, setWeatherstrips] = useState<
    Array<{ id: string; name: string; slug: string; isActive: boolean }>
  >([]);
  /** Ошибка загрузки справочников для полей manufacturer / coating / canvas / door thickness (как в «Настройках»). */
  const [fkCatalogError, setFkCatalogError] = useState<string | null>(null);
  /** Подсказка про роль/API — только если ошибка не чисто сетевая («Failed to fetch»). */
  const [fkCatalogShowPermissionHint, setFkCatalogShowPermissionHint] = useState(false);
  const [productNotFound, setProductNotFound] = useState(false);
  const [cardSections, setCardSections] = useState<string[]>([...DEFAULT_CARD_SECTIONS]);
  const [productMeta, setProductMeta] = useState<{
    createdBy: string | null;
    createdAt: string | null;
    updatedBy: string | null;
    updatedAt: string | null;
  }>({ createdBy: null, createdAt: null, updatedBy: null, updatedAt: null });
  const [suggestedSizes, setSuggestedSizes] = useState<string[]>([]);
  const [parserInfo, setParserInfo] = useState<ParserInfo | null>(null);
  const [parserLoading, setParserLoading] = useState(false);
  const [parserBannerError, setParserBannerError] = useState<string | null>(null);
  const parserAbortRef = useRef<AbortController | null>(null);
  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  const [badgeDefinitions, setBadgeDefinitions] = useState<
    Array<{ id: string; key: string; label: string; sortOrder: number }>
  >([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    description: '',
    price: '',
    comparePrice: '',
    stock: 0,
    onOrder: false,
    categoryId: '',
    isActive: true,
    isFeatured: false,
    isNew: false,
    partnerId: '',
    sortOrder: 400,
    seoTitle: '',
    seoDescription: '',
    images: [] as string[],
    videoUrl: '',
    attributes: {} as Record<string, string>,
    sizes: [] as string[],
    openingSide: [] as string[],
    supplierId: '',
    supplierSku: '',
    supplierProductUrl: '',
    manufacturerId: '',
    coatingMaterialId: '',
    canvasTypeId: '',
    doorThicknessId: '',
    weatherstripId: '',
    supplierPrice: '',
    cardVariants: [] as Array<{
      name: string;
      price: string;
      image: string;
      size: string;
      color: string;
      extraOption: string;
      sortOrder: number;
    }>,
    catalogBadgeIds: [] as string[],
  });

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${PRODUCT_FORM_API_URL}/product-card-badges/definitions`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        setBadgeDefinitions(
          data.map((d: { id: string; key: string; label: string; sortOrder: number }) => ({
            id: d.id,
            key: d.key,
            label: d.label,
            sortOrder: d.sortOrder ?? 0,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setBadgeDefinitions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reqHighlight = useMemo(() => {
    const priceRaw = String(formData.price).trim().replace(',', '.');
    const priceNum = parseFloat(priceRaw);
    return {
      name: formData.name.trim().length > 0,
      category: Boolean(formData.categoryId.trim()),
      supplier: Boolean(formData.supplierId.trim()),
      supplierUrl: formData.supplierProductUrl.trim().length > 0,
      supplierSku:
        !formData.supplierId ||
        (formData.supplierSku != null && String(formData.supplierSku).trim().length > 0),
      price: priceRaw !== '' && Number.isFinite(priceNum) && priceNum > 0,
      stock: Number.isFinite(formData.stock) && formData.stock >= 0,
      sizes: formData.sizes.some((s) => s.trim().length > 0),
      images: formData.images.some((u) => u.trim().length > 0),
    };
  }, [
    formData.name,
    formData.categoryId,
    formData.supplierId,
    formData.supplierProductUrl,
    formData.supplierSku,
    formData.price,
    formData.stock,
    formData.sizes,
    formData.images,
  ]);

  /** Только метаданные парсера (без запроса цены на страницу поставщика). Цена — по кнопке «Получить цену». */
  const fetchParserMetadata = useCallback(
    async (supplierId: string, categoryId: string, url: string) => {
      const trimmed = url.trim();
      parserAbortRef.current?.abort();
      const ac = new AbortController();
      parserAbortRef.current = ac;

      if (!supplierId || !categoryId || !trimmed) {
        setParserInfo(null);
        setParserBannerError(null);
        setParserLoading(false);
        return;
      }

      setParserLoading(true);
      setParserBannerError(null);
      try {
        const params = new URLSearchParams();
        params.set('supplierId', supplierId);
        params.set('categoryId', categoryId);
        params.set('url', trimmed);
        const response = await apiFetch(
          `${PRODUCT_FORM_API_URL}/products/scrape/parser?${params.toString()}`,
          {
            headers: getAuthHeadersRef.current(),
            signal: ac.signal,
          }
        );
        if (!response.ok) {
          let errText =
            response.status === 429
              ? 'Слишком много запросов к серверу. Подождите несколько секунд и попробуйте снова.'
              : `Не удалось получить данные парсера (код ${response.status}).`;
          try {
            const errBody = (await response.json()) as { message?: string };
            if (typeof errBody?.message === 'string' && errBody.message.trim()) {
              errText = errBody.message;
            }
          } catch {
            // ignore
          }
          setParserInfo(null);
          setParserBannerError(errText);
          return;
        }
        const data = (await response.json()) as { parser?: ParserInfo };
        setParserBannerError(null);
        setParserInfo(data.parser ?? null);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setParserInfo(null);
        setParserBannerError('Ошибка сети при запросе парсера.');
      } finally {
        if (parserAbortRef.current === ac) {
          setParserLoading(false);
        }
      }
    },
    []
  );

  const handleSupplierProductUrlBlur = () => {
    const supplierId = formData.supplierId;
    const categoryId = formData.categoryId;
    const url = formData.supplierProductUrl;
    if (supplierId && categoryId && url.trim()) {
      void fetchParserMetadata(supplierId, categoryId, url);
    }
  };

  // Атрибуты категории и товара
  const [categoryAttributes, setCategoryAttributes] = useState<ProductCategoryAttribute[]>([]);
  const [customAttributes, setCustomAttributes] = useState<{ key: string; value: string }[]>([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  // Флаги автогенерации
  const [autoSlug, setAutoSlug] = useState(false); // false по умолчанию, т.к. редактирование
  const [autoSku, setAutoSku] = useState(false); // false по умолчанию, т.к. редактирование
  const [autoSeoTitle, setAutoSeoTitle] = useState(false);
  const [autoSeoDescription, setAutoSeoDescription] = useState(false);
  const [initialName, setInitialName] = useState(''); // для отслеживания изменения названия

  // Загрузка изображений
  const formRef = useRef<HTMLFormElement>(null);
  const pageHeaderRef = useRef<HTMLDivElement>(null);
  const {
    saveButtonAnchorRef,
    saveButtonRef,
    saveButtonFixed,
    saveButtonFixedLeft,
    saveButtonPlaceholderSize,
    saveButtonPinnedTopPx,
    saveButtonPortalRoot,
    handleHeaderSaveClick,
    submitProductForm,
  } = useProductEditSaveButton({
    saving,
    loading,
    productNotFound,
    formRef,
    pageHeaderRef,
  });
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    // Контент-менеджеры всегда видят все секции формы (поставщики, цена, варианты и т.д.)
    if (user?.role === 'CONTENT_MANAGER') {
      setCardSections([...DEFAULT_CARD_SECTIONS]);
    } else {
      setCardSections(getCardSections());
    }
  }, [user?.role]);

  const showSection = (key: string) => cardSections.includes(key);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiFetch(`${PRODUCT_FORM_API_URL}/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await apiFetch(
          `${PRODUCT_FORM_API_URL}/admin/catalog/suppliers?limit=1000`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch suppliers:', err);
      }
    };
    fetchSuppliers();
  }, [getAuthHeaders]);

  // Fetch partners
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await apiFetch(`${PRODUCT_FORM_API_URL}/admin/partners?limit=1000`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setPartners(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch partners:', err);
      }
    };
    fetchPartners();
  }, [getAuthHeaders]);

  useEffect(() => {
    let cancelled = false;
    const mapRow = (m: { id: string; name: string; slug: string; isActive?: boolean }) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      isActive: m.isActive !== false,
    });
    const listHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(getAuthHeaders() as Record<string, string>),
    };
    void (async () => {
      try {
        const [mList, cmList, ctList, dtList, wsList] = await Promise.all([
          fetchAdminManufacturersList({ limit: 500 }, listHeaders),
          fetchAdminCoatingMaterialsList({ limit: 500 }, listHeaders),
          fetchAdminCanvasTypesList({ limit: 500 }, listHeaders),
          fetchAdminDoorThicknessesList({ limit: 500 }, listHeaders),
          fetchAdminWeatherstripsList({ limit: 500 }, listHeaders),
        ]);
        if (cancelled) return;
        setManufacturers(mList.map(mapRow));
        setCoatingMaterials(cmList.map(mapRow));
        setCanvasTypes(ctList.map(mapRow));
        setDoorThicknesses(dtList.map(mapRow));
        setWeatherstrips(wsList.map(mapRow));
        setFkCatalogError(null);
        setFkCatalogShowPermissionHint(false);
      } catch (err) {
        console.error('Failed to fetch catalog FK lists:', err);
        if (!cancelled) {
          if (isNetworkFetchError(err)) {
            setFkCatalogError(
              'Не удалось загрузить справочники: запрос к API не выполнился (сеть, CORS, смешанный HTTP/HTTPS или неверный NEXT_PUBLIC_API_URL). Проверьте вкладку «Сеть» в инструментах разработчика.'
            );
            setFkCatalogShowPermissionHint(false);
          } else {
            const part =
              err instanceof Error && err.message.trim()
                ? err.message.trim()
                : getApiErrorMessage(
                    err,
                    'Не удалось загрузить справочники (производители, материалы, тип полотна, толщина двери, уплотнители).'
                  );
            setFkCatalogError(part);
            setFkCatalogShowPermissionHint(true);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  // Предупреждение после создания копии, если часть комплектующих не перенеслась
  useEffect(() => {
    if (loading || productNotFound) return;
    const raw = searchParams.get('componentsCopyError');
    if (!raw) return;
    const num = parseInt(raw, 10);
    if (!Number.isFinite(num) || num <= 0) return;

    setError((prev) => {
      if (prev) return prev;
      return `Товар создан, но не удалось автоматически скопировать ${num} комплектующих. Добавьте их вручную в блоке «Комплектующие».`;
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('componentsCopyError');
    const q = params.toString();
    router.replace(`/admin/catalog/products/${productId}/edit${q ? `?${q}` : ''}`, {
      scroll: false,
    });
  }, [loading, productId, productNotFound, router, searchParams]);

  // Fetch product
  useEffect(() => {
    if (!productId) {
      setError('ID товара не указан');
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    setProductNotFound(false);

    const run = async () => {
      try {
        const productUrl = `${PRODUCT_FORM_API_URL}/products/${encodeURIComponent(productId)}?t=${Date.now()}`;
        const response = await apiFetch(productUrl, {
          cache: 'no-store',
          signal: ac.signal,
        });

        if (!active) return;

        if (response.status === 404) {
          setProductNotFound(true);
          throw new Error('Товар не найден');
        }

        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.status}`);
        }

        const product: Product = await response.json();
        if (!active) return;

        // Загружаем атрибуты категории сначала, чтобы правильно разделить атрибуты
        let loadedCategoryAttributes: ProductCategoryAttribute[] = [];
        const nameToSlugMap: Record<string, string> = {};
        const categoryAttrNames: string[] = [];
        const categoryAttrSlugs: string[] = [];

        if (product.categoryId) {
          try {
            const attrsUrl = `${PRODUCT_FORM_API_URL}/categories/${encodeURIComponent(product.categoryId)}/attributes?t=${Date.now()}`;
            const attrsResponse = await apiFetch(attrsUrl, {
              cache: 'no-store',
              signal: ac.signal,
            });
            if (!active) return;
            if (attrsResponse.ok) {
              const attrsData: ProductCategoryAttribute[] = await attrsResponse.json();
              // Сортируем по order для гарантии правильного порядка
              loadedCategoryAttributes = attrsData.sort((a, b) => (a.order || 0) - (b.order || 0));
              setCategoryAttributes(loadedCategoryAttributes);

              // Создаём маппинги
              loadedCategoryAttributes.forEach((ca) => {
                nameToSlugMap[ca.attribute.name] = ca.attribute.slug;
                categoryAttrNames.push(ca.attribute.name);
                categoryAttrSlugs.push(ca.attribute.slug);
              });
            }
          } catch (attrErr) {
            if ((attrErr as Error).name === 'AbortError') return;
            console.error('Error loading category attributes:', attrErr);
          }
        }

        if (!active) return;

        // Разделяем атрибуты на категорийные и кастомные
        // Атрибуты могут быть в двух форматах: массив (новый) или объект (старый)
        const categoryAttrsOnly: Record<string, string> = {};
        const customAttrs: { key: string; value: string }[] = [];

        // Преобразуем атрибуты в единый формат для обработки
        type AttrItem = { name: string; value: string };
        let attrsToProcess: AttrItem[] = [];

        if (product.attributes) {
          if (Array.isArray(product.attributes)) {
            // Новый формат - массив [{name, value}, ...]
            attrsToProcess = product.attributes as AttrItem[];
          } else {
            // Старый формат - объект {key: value, ...}
            const attrsObj = product.attributes as Record<string, string>;
            attrsToProcess = Object.entries(attrsObj).map(([key, value]) => ({
              name: key,
              value: String(value),
            }));
          }
        }

        attrsToProcess.forEach(({ name, value }) => {
          // Проверяем, является ли имя атрибутом категории
          if (categoryAttrNames.includes(name)) {
            // Это атрибут категории - преобразуем имя в slug для формы
            const slug = nameToSlugMap[name];
            if (slug) {
              categoryAttrsOnly[slug] = value;
            }
          } else if (categoryAttrSlugs.includes(name)) {
            // Старый формат - ключ уже является slug'ом
            categoryAttrsOnly[name] = value;
          } else {
            // Это кастомный атрибут - сохраняем как есть
            customAttrs.push({ key: name, value });
          }
        });

        if (product.manufacturer?.name) {
          categoryAttrsOnly[CATEGORY_ATTR_SLUG_MANUFACTURER] = product.manufacturer.name;
        }
        if (product.coatingMaterial?.name) {
          categoryAttrsOnly[CATEGORY_ATTR_SLUG_COATING_MATERIAL] = product.coatingMaterial.name;
        }
        if (product.canvasType?.name) {
          categoryAttrsOnly[CATEGORY_ATTR_SLUG_CANVAS_TYPE] = product.canvasType.name;
        }
        if (product.doorThickness?.name) {
          categoryAttrsOnly[CATEGORY_ATTR_SLUG_DOOR_THICKNESS] = product.doorThickness.name;
        }
        if (product.weatherstrip?.name) {
          categoryAttrsOnly[CATEGORY_ATTR_SLUG_WEATHERSTRIP] = product.weatherstrip.name;
        }

        // Находим основного поставщика
        const mainSupplier = product.suppliers?.find((ps) => ps.isMainSupplier);
        const supplierId = mainSupplier?.supplierId || '';
        const supplierProductUrl = mainSupplier?.supplierProductUrl || '';
        const supplierSku =
          mainSupplier?.supplierSku != null ? String(mainSupplier.supplierSku) : '';
        const supplierPrice = mainSupplier?.supplierPrice ? String(mainSupplier.supplierPrice) : '';

        const cardVariantsForm = (product.cardVariants || []).map((v) => ({
          name: v.name || '',
          price: String(v.price ?? ''),
          image: v.image || '',
          size: v.size || '',
          color: v.color || '',
          extraOption: v.extraOption || '',
          sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : 0,
        }));

        if (!active) return;

        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          sku: product.sku || '',
          description: product.description || '',
          price: String(product.price || ''),
          comparePrice: product.comparePrice ? String(product.comparePrice) : '',
          stock: product.stock || 0,
          onOrder: product.onOrder ?? false,
          categoryId: product.categoryId || '',
          supplierId: supplierId,
          supplierSku: supplierSku,
          supplierProductUrl: supplierProductUrl,
          manufacturerId: product.manufacturerId ?? '',
          coatingMaterialId: product.coatingMaterialId ?? '',
          canvasTypeId: product.canvasTypeId ?? '',
          doorThicknessId: product.doorThicknessId ?? '',
          weatherstripId: product.weatherstripId ?? '',
          supplierPrice: supplierPrice,
          isActive: product.isActive ?? true,
          isFeatured: product.isFeatured ?? false,
          isNew: product.isNew ?? false,
          partnerId: product.partnerId || '',
          sortOrder: product.sortOrder ?? 0,
          seoTitle: product.seoTitle || '',
          seoDescription: product.seoDescription || '',
          images: product.images || [],
          videoUrl: product.videoUrl || '',
          attributes: categoryAttrsOnly,
          sizes: product.sizes || [],
          openingSide: product.openingSide || [],
          cardVariants: cardVariantsForm,
          catalogBadgeIds: (product.cardBadgeSelections ?? [])
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((s) => s.badgeId),
        });

        // Сохраняем начальное название для отслеживания изменений
        setInitialName(product.name || '');

        setProductMeta({
          createdBy: product.createdBy?.email ?? null,
          createdAt: product.createdAt ?? null,
          updatedBy: product.updatedBy?.email ?? null,
          updatedAt: product.updatedAt ?? null,
        });

        setCustomAttributes(customAttrs);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (!active) return;
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      ac.abort();
    };
    // pathname: при клиентской навигации из списка сегмент может восстановиться из кэша маршрутизатора
  }, [productId, pathname]);

  // Подсказки размеров из других товаров этой категории
  useEffect(() => {
    if (!formData.categoryId) {
      setSuggestedSizes([]);
      return;
    }
    let cancelled = false;
    apiFetch(
      `${PRODUCT_FORM_API_URL}/products/admin/sizes-by-category?categoryId=${encodeURIComponent(formData.categoryId)}`,
      { headers: getAuthHeaders() }
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data: string[]) => {
        if (!cancelled && Array.isArray(data)) setSuggestedSizes(data);
      })
      .catch(() => {
        if (!cancelled) setSuggestedSizes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, getAuthHeaders]);

  // Атрибуты категории при смене категории (обязательность и варианты списков — как в настройках категории)
  useEffect(() => {
    const fetchCategoryAttributes = async () => {
      if (!formData.categoryId) {
        setCategoryAttributes([]);
        return;
      }
      try {
        const response = await apiFetch(
          `${PRODUCT_FORM_API_URL}/categories/${encodeURIComponent(formData.categoryId)}/attributes?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (response.ok) {
          const data: ProductCategoryAttribute[] = await response.json();
          const sorted = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));
          setCategoryAttributes(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch category attributes:', err);
      }
    };
    void fetchCategoryAttributes();
  }, [formData.categoryId]);

  // Какой парсер будет использован — при смене поставщика/категории; для новой ссылки — после blur поля URL.
  useEffect(() => {
    const supplierId = formData.supplierId;
    const categoryId = formData.categoryId;
    const url = formData.supplierProductUrl.trim();
    if (!supplierId || !categoryId || !url) {
      parserAbortRef.current?.abort();
      setParserInfo(null);
      setParserBannerError(null);
      setParserLoading(false);
      return;
    }
    void fetchParserMetadata(supplierId, categoryId, formData.supplierProductUrl);
  }, [formData.supplierId, formData.categoryId, fetchParserMetadata]);

  useEffect(() => {
    return () => {
      parserAbortRef.current?.abort();
    };
  }, []);

  // Flatten categories for select
  const flattenCategories = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = [];
    for (const cat of cats) {
      result.push({ id: cat.id, name: prefix + cat.name });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, prefix + '— '));
      }
    }
    return result;
  };

  const flatCategories = flattenCategories(categories);

  /** Корень «Межкомнатные двери» для подсказок комплектующих по всему поддереву */
  const interiorDoorsRootForHints = useMemo(
    () => findInteriorDoorsRootForSelection(categories, formData.categoryId),
    [categories, formData.categoryId]
  );

  // Получить название категории по ID
  const getCategoryName = (categoryId: string): string => {
    const category = flatCategories.find((c) => c.id === categoryId);
    return category ? category.name.replace(/^[—\s]+/, '') : '';
  };

  // Обновить SEO поля при изменении данных
  const updateSeoFields = (
    name: string,
    categoryId: string,
    shouldUpdateTitle: boolean,
    shouldUpdateDescription: boolean
  ) => {
    const categoryName = getCategoryName(categoryId);
    const updates: { seoTitle?: string; seoDescription?: string } = {};

    if (shouldUpdateTitle) {
      updates.seoTitle = generateSeoTitle(name, categoryName);
    }
    if (shouldUpdateDescription) {
      updates.seoDescription = generateSeoDescription(name, categoryName);
    }

    return updates;
  };

  // Обработчик для полей цены - позволяет вводить только числа и точку
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Разрешаем пустую строку, числа и одну точку для десятичных
    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
  };

  // Обработчик для целочисленных полей (stock)
  const handleIntegerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Разрешаем только цифры
    const sanitized = value.replace(/[^0-9]/g, '');
    const numValue = sanitized === '' ? 0 : parseInt(sanitized, 10);
    setFormData((prev) => ({ ...prev, [name]: numValue }));
  };

  const copyProductName = useCallback(async () => {
    const text = formData.name.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNameCopyFlashKey((key) => key + 1);
      setNameCopied(true);
      if (nameCopyTimeoutRef.current) {
        window.clearTimeout(nameCopyTimeoutRef.current);
      }
      nameCopyTimeoutRef.current = window.setTimeout(() => {
        setNameCopied(false);
        nameCopyTimeoutRef.current = null;
      }, 2000);
    } catch {
      setNameCopied(false);
    }
  }, [formData.name]);

  const clearSupplierProductUrl = useCallback(() => {
    setParserInfo(null);
    setParserBannerError(null);
    setFormData((prev) => ({ ...prev, supplierProductUrl: '' }));
  }, []);

  useEffect(() => {
    return () => {
      if (nameCopyTimeoutRef.current) {
        window.clearTimeout(nameCopyTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      // Автогенерация полей при изменении названия
      if (name === 'name') {
        const nameChanged = value !== initialName;
        setFormData((prev) => {
          const updates: Partial<typeof prev> = { name: value };

          // Автогенерируем slug если название изменилось или включён autoSlug
          if (nameChanged || autoSlug) {
            updates.slug = transliterate(value);
            setAutoSlug(true);
          }

          // Автогенерируем SKU если пустой или если sku был сгенерирован автоматически
          if (!prev.sku || autoSku) {
            updates.sku = generateSku();
            setAutoSku(true);
          }

          // Обновляем SEO поля если пустые или были автосгенерированы
          if (!prev.seoTitle || autoSeoTitle) {
            const seoUpdates = updateSeoFields(value, prev.categoryId, true, false);
            Object.assign(updates, seoUpdates);
            setAutoSeoTitle(true);
          }
          if (!prev.seoDescription || autoSeoDescription) {
            const seoUpdates = updateSeoFields(value, prev.categoryId, false, true);
            Object.assign(updates, seoUpdates);
            setAutoSeoDescription(true);
          }

          return { ...prev, ...updates };
        });
      } else if (name === 'categoryId') {
        setParserInfo(null);
        setParserBannerError(null);
        // При смене категории обновляем SEO если поля пустые или автосгенерированы
        setFormData((prev) => {
          const updates: Partial<typeof prev> = { categoryId: value };

          if (!prev.seoTitle || autoSeoTitle) {
            const seoUpdates = updateSeoFields(prev.name, value, true, false);
            Object.assign(updates, seoUpdates);
          }
          if (!prev.seoDescription || autoSeoDescription) {
            const seoUpdates = updateSeoFields(prev.name, value, false, true);
            Object.assign(updates, seoUpdates);
          }

          return { ...prev, ...updates };
        });
      } else if (name === 'supplierId') {
        setParserInfo(null);
        setParserBannerError(null);
        setFormData((prev) => ({ ...prev, supplierId: value }));
      } else if (name === 'supplierProductUrl') {
        setParserInfo(null);
        setParserBannerError(null);
        setFormData((prev) => ({ ...prev, supplierProductUrl: value }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  // Обработчик ручного изменения slug
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
  };

  // Обработчик ручного изменения SKU
  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSku(false);
    setFormData((prev) => ({ ...prev, sku: e.target.value }));
  };

  // Обработчик ручного изменения SEO заголовка
  const handleSeoTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSeoTitle(false);
    setFormData((prev) => ({ ...prev, seoTitle: e.target.value }));
  };

  // Обработчик ручного изменения SEO описания
  const handleSeoDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAutoSeoDescription(false);
    setFormData((prev) => ({ ...prev, seoDescription: e.target.value }));
  };

  // Обработка загрузки изображений
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setImageError(null);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      // Проверка типа файла
      if (!(PRODUCT_IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
        setImageError(`Файл ${file.name}: неподдерживаемый формат. Разрешены: JPG, PNG, WebP, GIF`);
        continue;
      }

      // Проверка размера
      if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE) {
        setImageError(`Файл ${file.name}: размер превышает 5MB`);
        continue;
      }

      // Конвертируем в base64
      const base64 = await fileToBase64(file);
      newImages.push(base64);
    }

    if (newImages.length > 0) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const handleVariantImageUpload = async (file: File, index: number) => {
    if (!(PRODUCT_IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setImageError('Разрешены форматы: JPG, PNG, WebP, GIF');
      return;
    }
    if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE) {
      setImageError('Размер файла не более 5MB');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setFormData((prev) => {
        const next = [...prev.cardVariants];
        if (next[index] === undefined) {
          next[index] = {
            name: '',
            price: '',
            image: '',
            size: '',
            color: '',
            extraOption: '',
            sortOrder: index,
          };
        }
        next[index] = { ...next[index], image: base64 };
        return { ...prev, cardVariants: next };
      });
      setImageError(null);
    } catch {
      setImageError('Ошибка загрузки файла');
    }
  };

  const handleToggleCatalogBadge = (badgeId: string) => {
    setFormData((prev) => {
      const i = prev.catalogBadgeIds.indexOf(badgeId);
      if (i >= 0) {
        return { ...prev, catalogBadgeIds: prev.catalogBadgeIds.filter((id) => id !== badgeId) };
      }
      if (prev.catalogBadgeIds.length >= 5) {
        alert('Можно выбрать не более 5 бэйджей слева от фото');
        return prev;
      }
      return { ...prev, catalogBadgeIds: [...prev.catalogBadgeIds, badgeId] };
    });
  };

  const handleImageUrlAdd = () => setImageUrlModalOpen(true);

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.images.length) return;

    setFormData((prev) => {
      const newImages = [...prev.images];
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const missing = validateAdminProductRequiredFields(
      {
        name: formData.name,
        categoryId: formData.categoryId,
        supplierId: formData.supplierId,
        supplierProductUrl: formData.supplierProductUrl,
        supplierSku: formData.supplierSku,
        price: formData.price,
        stock: formData.stock,
        sizes: formData.sizes,
        images: formData.images,
        attributes: formData.attributes,
        manufacturerId: formData.manufacturerId,
        coatingMaterialId: formData.coatingMaterialId,
        canvasTypeId: formData.canvasTypeId,
        doorThicknessId: formData.doorThicknessId,
        weatherstripId: formData.weatherstripId,
      },
      categoryAttributes
    );
    if (missing.length > 0) {
      setError(
        `Не удалось сохранить: не заполнены обязательные поля: ${missing.join(', ')}. Заполните их и попробуйте снова.`
      );
      return;
    }

    setSaving(true);

    try {
      // Собираем все атрибуты в правильном порядке
      // Используем массив для сохранения порядка, затем конвертируем в объект
      const orderedAttributes: Array<{ key: string; value: string; slug?: string }> = [];

      // 1. Сначала атрибуты категории в порядке их определения
      // categoryAttributes уже отсортированы по order
      categoryAttributes.forEach((ca) => {
        const slug = ca.attribute.slug;
        if (isManufacturerFkCategorySlug(slug)) {
          const m = manufacturers.find((x) => x.id === formData.manufacturerId);
          if (m) {
            orderedAttributes.push({
              key: ca.attribute.name,
              value: m.name,
              slug: ca.attribute.slug,
            });
          }
          return;
        }
        if (isCoatingMaterialFkCategorySlug(slug)) {
          const cm = coatingMaterials.find((x) => x.id === formData.coatingMaterialId);
          if (cm) {
            orderedAttributes.push({
              key: ca.attribute.name,
              value: cm.name,
              slug: ca.attribute.slug,
            });
          }
          return;
        }
        if (isCanvasTypeFkCategorySlug(slug)) {
          const ct = canvasTypes.find((x) => x.id === formData.canvasTypeId);
          if (ct) {
            orderedAttributes.push({
              key: ca.attribute.name,
              value: ct.name,
              slug: ca.attribute.slug,
            });
          }
          return;
        }
        if (isDoorThicknessFkCategorySlug(slug)) {
          const dt = doorThicknesses.find((x) => x.id === formData.doorThicknessId);
          if (dt) {
            orderedAttributes.push({
              key: ca.attribute.name,
              value: dt.name,
              slug: ca.attribute.slug,
            });
          }
          return;
        }
        if (isWeatherstripFkCategorySlug(slug)) {
          const ws = weatherstrips.find((x) => x.id === formData.weatherstripId);
          if (ws) {
            orderedAttributes.push({
              key: ca.attribute.name,
              value: ws.name,
              slug: ca.attribute.slug,
            });
          }
          return;
        }
        const value = formData.attributes[slug];
        if (value) {
          orderedAttributes.push({
            key: ca.attribute.name,
            value: value,
            slug: ca.attribute.slug,
          });
        }
      });

      // 2. Затем кастомные атрибуты в порядке их добавления
      customAttributes.forEach(({ key, value }) => {
        if (key.trim() && value) {
          orderedAttributes.push({
            key: key.trim(),
            value: value,
          });
        }
      });

      // Сохраняем как массив для гарантии порядка
      // Формат: [{ name, value, slug? }, ...] — slug для фильтров каталога по attribute.slug
      const attributesArray = orderedAttributes.map(({ key, value, slug }) => ({
        name: key,
        value: value,
        ...(slug ? { slug } : {}),
      }));

      // Также создаём объект для обратной совместимости (но порядок не гарантирован)
      const allAttributes: Record<string, string> = {};
      orderedAttributes.forEach(({ key, value }) => {
        allAttributes[key] = value;
      });

      console.log('=== SAVING PRODUCT ===');
      console.log('Attributes array (ordered):', attributesArray);

      const cleanedSizes = formData.sizes
        .map((size) => size.trim())
        .filter((size) => size.length > 0);
      const hasSizes = cleanedSizes.length > 0;
      const hasOpeningSide = formData.openingSide.length > 0;

      const response = await apiFetch(`${PRODUCT_FORM_API_URL}/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          sku: formData.sku || null,
          description: formData.description || null,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          stock: formData.stock,
          onOrder: formData.onOrder,
          categoryId: formData.categoryId,
          isActive: formData.isActive,
          isFeatured: formData.isFeatured,
          isNew: formData.isNew,
          isPartnerProduct: !!formData.partnerId,
          partnerId: formData.partnerId || null,
          sortOrder: formData.sortOrder || 0,
          seoTitle: formData.seoTitle || null,
          seoDescription: formData.seoDescription || null,
          attributes: attributesArray, // Теперь массив с гарантированным порядком
          images: formData.images,
          videoUrl: formData.videoUrl?.trim() || null,
          sizes: hasSizes ? cleanedSizes : null,
          openingSide: hasOpeningSide ? formData.openingSide : null,
          supplierId: formData.supplierId || null,
          supplierProductUrl: formData.supplierProductUrl || null,
          supplierPrice: formData.supplierPrice ? parseFloat(formData.supplierPrice) : undefined,
          // Пустой артикул — явная строка "", не null: иначе ключ может пропасть из DTO после валидации и очистка не доходит до БД
          supplierSku: formData.supplierId ? formData.supplierSku.trim() : undefined,
          manufacturerId: formData.manufacturerId.trim() || null,
          coatingMaterialId: formData.coatingMaterialId.trim() || null,
          canvasTypeId: formData.canvasTypeId.trim() || null,
          doorThicknessId: formData.doorThicknessId.trim() || null,
          weatherstripId: formData.weatherstripId.trim() || null,
          cardVariants: formData.cardVariants
            .filter((v) => v.name.trim() && !Number.isNaN(parseFloat(v.price)))
            .slice(0, 5)
            .map((v) => ({
              name: v.name.trim(),
              price: parseFloat(v.price),
              image: v.image.trim() || undefined,
              size: v.size.trim() || undefined,
              color: v.color.trim() || undefined,
              extraOption: v.extraOption.trim() || undefined,
              sortOrder: v.sortOrder,
            })),
          catalogBadgeIds: formData.catalogBadgeIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(data, 'Ошибка сохранения'));
      }

      const updated = (await response.json()) as Product;
      if (
        updated?.createdBy?.email ||
        updated?.updatedBy?.email ||
        updated?.createdAt ||
        updated?.updatedAt
      ) {
        setProductMeta({
          createdBy: updated.createdBy?.email ?? productMeta.createdBy,
          createdAt: updated.createdAt ?? productMeta.createdAt,
          updatedBy: updated.updatedBy?.email ?? productMeta.updatedBy,
          updatedAt: updated.updatedAt ?? productMeta.updatedAt,
        });
      }

      // Ответ PATCH теперь включает suppliers после upsert; синхронизируем поля поставщика с сервером
      if (Array.isArray(updated?.suppliers)) {
        const main = updated.suppliers.find((ps) => ps.isMainSupplier);
        if (main) {
          setFormData((prev) => ({
            ...prev,
            supplierId: main.supplierId || prev.supplierId,
            supplierSku:
              main.supplierSku != null && String(main.supplierSku).length > 0
                ? String(main.supplierSku)
                : '',
            supplierProductUrl: main.supplierProductUrl ?? prev.supplierProductUrl,
            supplierPrice:
              main.supplierPrice != null ? String(main.supplierPrice) : prev.supplierPrice,
          }));
        }
      }

      setSuccess('Товар успешно сохранён');
      setTimeout(() => setSuccess(null), 3000);
      void queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_LIST_QUERY_KEY] });

      // Сброс кэша публичных страниц (товар и каталог), чтобы изменения отображались без двойной перезагрузки
      const slug = formData.slug?.trim();
      if (slug) {
        apiFetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: [`/product/${slug}`, { path: '/catalog/products', type: 'layout' as const }],
            tags: ['catalog-pages'],
          }),
        }).catch((e) => console.warn('Revalidate failed:', e));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return {
    productId,
    router,
    fromCategory,
    navigateBackToProductsList,
    loading,
    saving,
    fetchingPrice,
    setFetchingPrice,
    error,
    success,
    setError,
    setSuccess,
    nameCopied,
    nameCopyFlashKey,
    partners,
    suppliers,
    fkCatalogError,
    fkCatalogShowPermissionHint,
    productNotFound,
    productMeta,
    suggestedSizes,
    parserInfo,
    setParserInfo,
    parserLoading,
    parserBannerError,
    setParserBannerError,
    formData,
    setFormData,
    reqHighlight,
    handleSupplierProductUrlBlur,
    categoryAttributes,
    customAttributes,
    setCustomAttributes,
    newAttrKey,
    setNewAttrKey,
    newAttrValue,
    setNewAttrValue,
    manufacturers,
    coatingMaterials,
    canvasTypes,
    doorThicknesses,
    weatherstrips,
    badgeDefinitions,
    formRef,
    pageHeaderRef,
    saveButtonAnchorRef,
    saveButtonRef,
    saveButtonFixed,
    saveButtonFixedLeft,
    saveButtonPlaceholderSize,
    saveButtonPinnedTopPx,
    saveButtonPortalRoot,
    handleHeaderSaveClick,
    submitProductForm,
    imageError,
    showSection,
    flatCategories,
    interiorDoorsRootForHints,
    copyProductName,
    handleChange,
    handleSlugChange,
    handleSkuChange,
    handlePriceChange,
    handleIntegerChange,
    handleToggleCatalogBadge,
    handleVariantImageUpload,
    handleImageUpload,
    handleImageUrlAdd,
    removeImage,
    moveImage,
    handleSeoTitleChange,
    handleSeoDescriptionChange,
    handleSubmit,
    imageUrlModalOpen,
    setImageUrlModalOpen,
    getAuthHeaders,
    clearSupplierProductUrl,
  };
}

export type ProductEditPageModel = ReturnType<typeof useProductEditPage>;
