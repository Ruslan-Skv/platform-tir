'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { fetchAdminCanvasTypesList } from '@/shared/api/admin-canvas-types';
import { fetchAdminCoatingMaterialsList } from '@/shared/api/admin-coating-materials';
import { fetchAdminDoorThicknessesList } from '@/shared/api/admin-door-thicknesses';
import { fetchAdminManufacturersList } from '@/shared/api/admin-manufacturers';
import { fetchAdminWeatherstripsList } from '@/shared/api/admin-weatherstrips';
import { getApiErrorMessage, isNetworkFetchError } from '@/shared/lib/api-error';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  isCanvasTypeFkCategorySlug,
  isCoatingMaterialFkCategorySlug,
  isDoorThicknessFkCategorySlug,
  isManufacturerFkCategorySlug,
  isWeatherstripFkCategorySlug,
} from './catalog-attribute-fk-slugs';
import {
  type CategoryAttributeForCopy,
  type CopiedProductData,
  type CopyProductComponentPayload,
  type ProductForCopy,
  mapProductToCopyData,
  mapRawComponentsToCopyPayload,
} from './copy-product-utils';
import {
  collectInteriorDoorsSubtreeIdsFromRoots,
  findInteriorDoorsRootForSelection,
} from './interior-doors-category-utils';
import {
  PRODUCT_FORM_API_URL,
  PRODUCT_IMAGE_ALLOWED_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE,
} from './product-form-constants';
import { validateAdminProductRequiredFields } from './product-form-required-fields';
import {
  fileToBase64,
  generateSeoDescription,
  generateSeoTitle,
  generateSku,
  transliterate,
} from './product-form-utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface AttributeValue {
  id: string;
  value: string;
  colorHex?: string;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';
  unit?: string;
  isFilterable: boolean;
  values: AttributeValue[];
}

interface CategoryAttribute {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: Attribute;
}

const defaultFormData = {
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
  isNew: true,
  partnerId: '',
  sortOrder: 400,
  seoTitle: '',
  seoDescription: '',
  supplierId: '',
  supplierSku: '',
  supplierProductUrl: '',
  manufacturerId: '',
  coatingMaterialId: '',
  canvasTypeId: '',
  doorThicknessId: '',
  weatherstripId: '',
  supplierPrice: '',
  videoUrl: '',
  attributes: {} as Record<string, string>,
  images: [] as string[],
  sizes: [] as string[],
  openingSide: [] as string[],
  catalogBadgeIds: [] as string[],
};

interface ProductCreatePageProps {
  fromCategory?: string;
  categoryIdFromUrl?: string;
  /** ID товара из ?copyFrom= — для подгрузки копии с клиента, если SSR не достучался до API (часто в проде). */
  copyFromProductId?: string | null;
  initialCopyData?: CopiedProductData | null;
  copyError?: string | null;
  isCopyMode?: boolean;
}

interface ParserInfo {
  key: string;
  title: string;
}

export function useProductCreatePage({
  fromCategory = '',
  categoryIdFromUrl = '',
  copyFromProductId = null,
  initialCopyData = null,
  copyError: initialCopyError = null,
  isCopyMode = false,
}: ProductCreatePageProps = {}) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const getAuthHeadersRef = useRef(getAuthHeaders);
  getAuthHeadersRef.current = getAuthHeaders;
  const [saving, setSaving] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [error, setError] = useState<string | null>(initialCopyError);
  const [success, setSuccess] = useState<string | null>(null);
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
  const [fkCatalogError, setFkCatalogError] = useState<string | null>(null);
  const [fkCatalogShowPermissionHint, setFkCatalogShowPermissionHint] = useState(false);

  const [formData, setFormData] = useState(() => {
    const merged = initialCopyData?.formData ?? {
      ...defaultFormData,
      categoryId: categoryIdFromUrl || '',
    };
    return {
      ...merged,
      onOrder: merged.onOrder ?? false,
      catalogBadgeIds: merged.catalogBadgeIds ?? [],
    };
  });

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

  // Атрибуты категории и товара
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>(
    (initialCopyData?.categoryAttributes ?? []) as CategoryAttribute[]
  );
  const [customAttributes, setCustomAttributes] = useState<{ key: string; value: string }[]>(
    initialCopyData?.customAttributes ?? []
  );
  const [componentsToCopy, setComponentsToCopy] = useState<CopyProductComponentPayload[]>(
    () => initialCopyData?.componentsToCopy ?? []
  );
  const [newComponentDraft, setNewComponentDraft] = useState({
    name: '',
    type: '',
    price: '',
    image: '',
    stock: 0,
    isActive: true,
    sortOrder: 0,
  });
  const [editingComponentIndex, setEditingComponentIndex] = useState<number | null>(null);
  const [editingComponentDraft, setEditingComponentDraft] = useState({
    name: '',
    type: '',
    price: '',
    image: '',
    stock: 0,
    isActive: true,
    sortOrder: 0,
  });
  const [componentsDraftError, setComponentsDraftError] = useState<string | null>(null);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [autoSku, setAutoSku] = useState(true);
  const [autoSeoTitle, setAutoSeoTitle] = useState(!initialCopyData);
  const [autoSeoDescription, setAutoSeoDescription] = useState(!initialCopyData);

  const formRef = useRef<HTMLFormElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [suggestedSizes, setSuggestedSizes] = useState<string[]>([]);
  const [suggestedComponentNames, setSuggestedComponentNames] = useState<string[]>([]);
  const [parserInfo, setParserInfo] = useState<ParserInfo | null>(null);
  const [parserLoading, setParserLoading] = useState(false);
  const [parserBannerError, setParserBannerError] = useState<string | null>(null);
  const parserAbortRef = useRef<AbortController | null>(null);
  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  const [badgeDefinitions, setBadgeDefinitions] = useState<
    Array<{ id: string; key: string; label: string; sortOrder: number }>
  >([]);

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

  // Предзаполнение категории из URL (только когда не копируем)
  useEffect(() => {
    if (categoryIdFromUrl && !initialCopyData) {
      setFormData((prev) => ({ ...prev, categoryId: categoryIdFromUrl }));
    }
  }, [categoryIdFromUrl, initialCopyData]);

  // Список комплектующих исходного товара (админка: все позиции, включая неактивные)
  useEffect(() => {
    if (!copyFromProductId || !isCopyMode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(
          `${PRODUCT_FORM_API_URL}/product-components/admin/all?productId=${encodeURIComponent(copyFromProductId)}`,
          { headers: getAuthHeadersRef.current(), cache: 'no-store' }
        );
        if (cancelled || !res.ok) return;
        const data: unknown = await res.json();
        if (!cancelled) {
          setComponentsToCopy(mapRawComponentsToCopyPayload(data));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copyFromProductId, isCopyMode]);

  // Копирование: если SSR не получил товар (прод: внутренний URL бэкенда недоступен из Node), подгружаем с клиента через /api/v1 (nginx).
  useEffect(() => {
    if (!copyFromProductId || initialCopyData != null) return;

    let cancelled = false;
    const load = async () => {
      try {
        const productRes = await apiFetch(`${PRODUCT_FORM_API_URL}/products/${copyFromProductId}`, {
          cache: 'no-store',
        });
        if (!productRes.ok) {
          if (!cancelled) {
            setError('Не удалось загрузить товар для копирования');
          }
          return;
        }
        const product: ProductForCopy = await productRes.json();
        const catId = product.categoryId || product.category?.id;
        let categoryAttrsForCopy: CategoryAttributeForCopy[] = [];
        if (catId) {
          const attrsRes = await apiFetch(
            `${PRODUCT_FORM_API_URL}/categories/${catId}/attributes`,
            {
              cache: 'no-store',
            }
          );
          if (attrsRes.ok) {
            const attrsData = await attrsRes.json();
            categoryAttrsForCopy = attrsData.sort(
              (a: CategoryAttributeForCopy, b: CategoryAttributeForCopy) =>
                (a.order || 0) - (b.order || 0)
            );
          }
        }
        let rawComponents: unknown = [];
        try {
          const componentsRes = await apiFetch(
            `${PRODUCT_FORM_API_URL}/product-components/admin/all?productId=${encodeURIComponent(copyFromProductId)}`,
            {
              headers: getAuthHeadersRef.current(),
              cache: 'no-store',
            }
          );
          if (componentsRes.ok) {
            rawComponents = await componentsRes.json();
          }
        } catch {
          // Игнорируем: копирование товара возможно и без комплектующих
        }

        const mapped = mapProductToCopyData(product, categoryAttrsForCopy, rawComponents);
        if (cancelled) return;
        setError(null);
        setFormData(mapped.formData);
        setCategoryAttributes(mapped.categoryAttributes as CategoryAttribute[]);
        setCustomAttributes(mapped.customAttributes);
        setComponentsToCopy(mapped.componentsToCopy);
        setAutoSeoTitle(false);
        setAutoSeoDescription(false);
        setAutoSlug(true);
        setAutoSku(true);
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить товар для копирования');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [copyFromProductId, initialCopyData]);

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

  // Подсказки наименований: все уникальные названия из товаров в поддереве «Межкомнатные двери»
  useEffect(() => {
    if (!formData.categoryId) {
      setSuggestedComponentNames([]);
      return;
    }
    const root = findInteriorDoorsRootForSelection(categories, formData.categoryId);
    if (!root) {
      setSuggestedComponentNames([]);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      categoryId: root.id,
      includeSubtree: '1',
    });
    apiFetch(
      `${PRODUCT_FORM_API_URL}/product-components/admin/names-by-category?${params.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data: string[]) => {
        if (!cancelled && Array.isArray(data)) setSuggestedComponentNames(data);
      })
      .catch(() => {
        if (!cancelled) setSuggestedComponentNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, categories, getAuthHeaders]);

  // Fetch category attributes when category changes
  useEffect(() => {
    const fetchCategoryAttributes = async () => {
      if (!formData.categoryId) {
        setCategoryAttributes([]);
        return;
      }

      try {
        const response = await apiFetch(
          `${PRODUCT_FORM_API_URL}/categories/${formData.categoryId}/attributes`
        );
        if (response.ok) {
          const data: CategoryAttribute[] = await response.json();
          // Сортируем по order для гарантии правильного порядка
          const sortedData = data.sort((a, b) => (a.order || 0) - (b.order || 0));
          setCategoryAttributes(sortedData);
        }
      } catch (err) {
        console.error('Failed to fetch category attributes:', err);
      }
    };

    fetchCategoryAttributes();
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

  // Получить название категории по ID
  const getCategoryName = (categoryId: string): string => {
    const category = flatCategories.find((c) => c.id === categoryId);
    return category ? category.name.replace(/^[—\s]+/, '') : ''; // Убираем префиксы вложенности
  };

  /** ID категории «Межкомнатные двери» и всех дочерних (по дереву из API) */
  const interiorDoorsCategoryIds = useMemo(
    () => collectInteriorDoorsSubtreeIdsFromRoots(categories),
    [categories]
  );

  const isInteriorDoorsCategorySelected = useMemo(() => {
    if (!formData.categoryId) return false;
    return interiorDoorsCategoryIds.has(formData.categoryId);
  }, [formData.categoryId, interiorDoorsCategoryIds]);

  const addDraftComponent = () => {
    const name = newComponentDraft.name.trim();
    const type = newComponentDraft.type.trim();
    const price = parseFloat(newComponentDraft.price.replace(',', '.'));
    if (!name || !type || !Number.isFinite(price) || price < 0) {
      setComponentsDraftError('Заполните комплектующее: название, тип и корректную цену.');
      return;
    }
    setComponentsToCopy((prev) => [
      ...prev,
      {
        name,
        type,
        price,
        image: newComponentDraft.image.trim() || undefined,
        stock: Number.isFinite(newComponentDraft.stock) ? newComponentDraft.stock : 0,
        isActive: newComponentDraft.isActive,
        sortOrder: Number.isFinite(newComponentDraft.sortOrder) ? newComponentDraft.sortOrder : 0,
      },
    ]);
    setComponentsDraftError(null);
    setNewComponentDraft({
      name: '',
      type: '',
      price: '',
      image: '',
      stock: 0,
      isActive: true,
      sortOrder: 0,
    });
  };

  const removeDraftComponent = (index: number) => {
    setComponentsToCopy((prev) => prev.filter((_, i) => i !== index));
  };

  const startEditDraftComponent = (index: number) => {
    const item = componentsToCopy[index];
    if (!item) return;
    setEditingComponentIndex(index);
    setEditingComponentDraft({
      name: item.name,
      type: item.type,
      price: String(item.price),
      image: item.image ?? '',
      stock: item.stock,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
  };

  const cancelEditDraftComponent = () => {
    setEditingComponentIndex(null);
    setEditingComponentDraft({
      name: '',
      type: '',
      price: '',
      image: '',
      stock: 0,
      isActive: true,
      sortOrder: 0,
    });
  };

  const saveEditDraftComponent = () => {
    if (editingComponentIndex === null) return;
    const name = editingComponentDraft.name.trim();
    const type = editingComponentDraft.type.trim();
    const price = parseFloat(editingComponentDraft.price.replace(',', '.'));
    if (!name || !type || !Number.isFinite(price) || price < 0) {
      setComponentsDraftError('Заполните комплектующее: название, тип и корректную цену.');
      return;
    }
    setComponentsToCopy((prev) =>
      prev.map((item, idx) =>
        idx === editingComponentIndex
          ? {
              ...item,
              name,
              type,
              price,
              image: editingComponentDraft.image.trim() || undefined,
              stock: Number.isFinite(editingComponentDraft.stock) ? editingComponentDraft.stock : 0,
              isActive: editingComponentDraft.isActive,
              sortOrder: Number.isFinite(editingComponentDraft.sortOrder)
                ? editingComponentDraft.sortOrder
                : 0,
            }
          : item
      )
    );
    setComponentsDraftError(null);
    cancelEditDraftComponent();
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      // Auto-generate fields from name
      if (name === 'name') {
        setFormData((prev) => {
          const updates: Partial<typeof prev> = { name: value };

          if (autoSlug) {
            updates.slug = transliterate(value);
          }

          if (autoSku) {
            updates.sku = generateSku();
          }

          // Обновляем SEO поля
          const seoUpdates = updateSeoFields(
            value,
            prev.categoryId,
            autoSeoTitle,
            autoSeoDescription
          );

          return { ...prev, ...updates, ...seoUpdates };
        });
      } else if (name === 'categoryId') {
        setParserInfo(null);
        setParserBannerError(null);
        // При смене категории обновляем SEO
        setFormData((prev) => {
          const seoUpdates = updateSeoFields(prev.name, value, autoSeoTitle, autoSeoDescription);
          return { ...prev, categoryId: value, ...seoUpdates };
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

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSku(false);
    setFormData((prev) => ({ ...prev, sku: e.target.value }));
  };

  const handleSeoTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSeoTitle(false);
    setFormData((prev) => ({ ...prev, seoTitle: e.target.value }));
  };

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
      if (!(PRODUCT_IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
        setImageError(`Файл ${file.name}: неподдерживаемый формат. Разрешены: JPG, PNG, WebP, GIF`);
        continue;
      }

      if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE) {
        setImageError(`Файл ${file.name}: размер превышает 5MB`);
        continue;
      }

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
        `Не удалось создать товар: не заполнены обязательные поля: ${missing.join(', ')}. Заполните их и попробуйте снова.`
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

      // Сохраняем как массив для гарантии порядка; slug — для фильтров каталога
      const attributesArray = orderedAttributes.map(({ key, value, slug }) => ({
        name: key,
        value: value,
        ...(slug ? { slug } : {}),
      }));

      console.log('Creating product with attributes (ordered array):', attributesArray);

      const cleanedSizes = formData.sizes
        .map((size) => size.trim())
        .filter((size) => size.length > 0);
      const hasSizes = cleanedSizes.length > 0;
      const hasOpeningSide = formData.openingSide.length > 0;

      const productData = {
        name: formData.name,
        slug: formData.slug,
        sku: formData.sku || undefined,
        description: formData.description || undefined,
        price: parseFloat(formData.price) || 0,
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        stock: formData.stock,
        onOrder: formData.onOrder,
        categoryId: formData.categoryId,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        isNew: formData.isNew,
        isPartnerProduct: !!formData.partnerId,
        partnerId: formData.partnerId || undefined,
        sortOrder: formData.sortOrder ?? 400,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        attributes: attributesArray, // Массив с гарантированным порядком
        images: formData.images.length > 0 ? formData.images : undefined,
        sizes: hasSizes ? cleanedSizes : null,
        openingSide: hasOpeningSide ? formData.openingSide : null,
        supplierId: formData.supplierId || undefined,
        supplierProductUrl: formData.supplierProductUrl || undefined,
        supplierPrice: formData.supplierPrice ? parseFloat(formData.supplierPrice) : undefined,
        supplierSku:
          formData.supplierId && formData.supplierSku.trim()
            ? formData.supplierSku.trim()
            : undefined,
        manufacturerId: formData.manufacturerId.trim() || undefined,
        coatingMaterialId: formData.coatingMaterialId.trim() || undefined,
        canvasTypeId: formData.canvasTypeId.trim() || undefined,
        doorThicknessId: formData.doorThicknessId.trim() || undefined,
        weatherstripId: formData.weatherstripId.trim() || undefined,
        videoUrl: formData.videoUrl || undefined,
        catalogBadgeIds: formData.catalogBadgeIds,
      };

      const response = await apiFetch(`${PRODUCT_FORM_API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(data, 'Ошибка создания товара'));
      }

      const createdProduct = await response.json();

      let componentsCopyErrors = 0;
      if (componentsToCopy.length > 0) {
        for (const comp of componentsToCopy) {
          const payload: Record<string, unknown> = {
            name: comp.name,
            type: comp.type,
            price: comp.price,
            stock: comp.stock,
            isActive: comp.isActive,
            sortOrder: comp.sortOrder,
          };
          if (comp.image) payload.image = comp.image;
          try {
            const compRes = await apiFetch(
              `${PRODUCT_FORM_API_URL}/product-components/product/${createdProduct.id}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeaders(),
                },
                body: JSON.stringify(payload),
              }
            );
            if (!compRes.ok) componentsCopyErrors++;
          } catch {
            componentsCopyErrors++;
          }
        }
      }

      // Сброс кэша каталога на публичке, чтобы новый товар отображался без перезагрузки
      const revalidatePaths: Array<string | { path: string; type: 'layout' }> = [
        { path: '/catalog/products', type: 'layout' },
      ];
      if (createdProduct.slug) {
        revalidatePaths.push(`/product/${createdProduct.slug}`);
      }
      apiFetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: revalidatePaths, tags: ['catalog-pages'] }),
      }).catch((e) => console.warn('Revalidate failed:', e));
      router.refresh();

      const nextParams = new URLSearchParams();
      if (componentsCopyErrors > 0) {
        nextParams.set('componentsCopyError', String(componentsCopyErrors));
      }
      const returnCategoryId = fromCategory || categoryIdFromUrl || formData.categoryId;
      if (returnCategoryId) {
        nextParams.set('fromCategory', returnCategoryId);
      }
      const nextQuery = nextParams.toString();
      router.push(
        `/admin/catalog/products/${createdProduct.id}/edit${nextQuery ? `?${nextQuery}` : ''}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания товара');
    } finally {
      setSaving(false);
    }
  };

  const backUrl = fromCategory
    ? `/admin/catalog/products/category/${fromCategory}`
    : categoryIdFromUrl
      ? `/admin/catalog/products/category/${categoryIdFromUrl}`
      : '/admin/catalog/products';

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

  const clearSupplierProductUrl = () => {
    setParserInfo(null);
    setParserBannerError(null);
    setFormData((prev) => ({ ...prev, supplierProductUrl: '' }));
  };

  return {
    router,
    backUrl,
    fromCategory,
    categoryIdFromUrl,
    copyFromProductId,
    isCopyMode,
    saving,
    fetchingPrice,
    setFetchingPrice,
    error,
    success,
    setError,
    setSuccess,
    partners,
    suppliers,
    manufacturers,
    coatingMaterials,
    canvasTypes,
    doorThicknesses,
    weatherstrips,
    fkCatalogError,
    fkCatalogShowPermissionHint,
    formData,
    setFormData,
    reqHighlight,
    categoryAttributes,
    customAttributes,
    setCustomAttributes,
    componentsToCopy,
    newComponentDraft,
    setNewComponentDraft,
    editingComponentIndex,
    editingComponentDraft,
    setEditingComponentDraft,
    componentsDraftError,
    newAttrKey,
    setNewAttrKey,
    newAttrValue,
    setNewAttrValue,
    formRef,
    imageError,
    suggestedSizes,
    suggestedComponentNames,
    parserInfo,
    setParserInfo,
    parserLoading,
    parserBannerError,
    setParserBannerError,
    imageUrlModalOpen,
    setImageUrlModalOpen,
    badgeDefinitions,
    flatCategories,
    isInteriorDoorsCategorySelected,
    addDraftComponent,
    removeDraftComponent,
    startEditDraftComponent,
    cancelEditDraftComponent,
    saveEditDraftComponent,
    handleSupplierProductUrlBlur,
    clearSupplierProductUrl,
    handleChange,
    handleSlugChange,
    handleSkuChange,
    handlePriceChange,
    handleIntegerChange,
    handleSeoTitleChange,
    handleSeoDescriptionChange,
    handleImageUpload,
    handleImageUrlAdd,
    removeImage,
    moveImage,
    handleToggleCatalogBadge,
    handleSubmit,
    getAuthHeaders,
  };
}

export type ProductCreatePageModel = ReturnType<typeof useProductCreatePage>;
