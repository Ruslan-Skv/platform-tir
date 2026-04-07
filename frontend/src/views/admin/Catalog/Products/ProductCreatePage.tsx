'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/lib/api-error';

import { ImageUrlModal } from './ImageUrlModal';
import componentStyles from './ProductComponentsSection.module.css';
import styles from './ProductEditPage.module.css';
import {
  decodeMultiSelectStored,
  encodeMultiSelectValues,
  multiSelectHasSelection,
} from './category-attribute-multiselect';
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
  adminProductFieldHighlightClass,
  categoryAttributeValueFilled,
  validateAdminProductRequiredFields,
} from './product-form-required-fields';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

// Функция транслитерации для автогенерации slug
function transliterate(text: string): string {
  const ru: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Д: 'D',
    Е: 'E',
    Ё: 'Yo',
    Ж: 'Zh',
    З: 'Z',
    И: 'I',
    Й: 'Y',
    К: 'K',
    Л: 'L',
    М: 'M',
    Н: 'N',
    О: 'O',
    П: 'P',
    Р: 'R',
    С: 'S',
    Т: 'T',
    У: 'U',
    Ф: 'F',
    Х: 'H',
    Ц: 'Ts',
    Ч: 'Ch',
    Ш: 'Sh',
    Щ: 'Sch',
    Ъ: '',
    Ы: 'Y',
    Ь: '',
    Э: 'E',
    Ю: 'Yu',
    Я: 'Ya',
  };

  return text
    .split('')
    .map((char) => ru[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Функция генерации SKU (цифровой артикул)
function generateSku(): string {
  const timestamp = Date.now().toString().slice(-6); // последние 6 цифр timestamp
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0'); // 3 случайные цифры
  return `${timestamp}${random}`; // Итого 9 цифр
}

// Константа для названия сайта
const SITE_NAME = 'Территория интерьерных решений';

// Функция генерации SEO заголовка
function generateSeoTitle(productName: string, categoryName: string): string {
  if (!productName) return '';
  const title = categoryName
    ? `${productName} - ${categoryName} | ${SITE_NAME}`
    : `${productName} | ${SITE_NAME}`;
  return title.substring(0, 70); // Оптимальная длина для SEO
}

// Функция генерации SEO описания
function generateSeoDescription(productName: string, categoryName: string): string {
  if (!productName) return '';
  const categoryText = categoryName ? ` в категории ${categoryName}` : '';
  const description = `Купить ${productName}${categoryText}. Гарантия качества. ${SITE_NAME}`;
  return description.substring(0, 160); // Оптимальная длина для SEO
}

const defaultFormData = {
  name: '',
  slug: '',
  sku: '',
  description: '',
  price: '',
  comparePrice: '',
  stock: 0,
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
  supplierPrice: '',
  videoUrl: '',
  weight: '',
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

export function ProductCreatePage({
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

  const [formData, setFormData] = useState(() => {
    const merged = initialCopyData?.formData ?? {
      ...defaultFormData,
      categoryId: categoryIdFromUrl || '',
    };
    return {
      ...merged,
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

  // Загрузка изображений
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
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
    fetch(`${API_URL}/product-card-badges/definitions`, { cache: 'no-store' })
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
        const response = await fetch(`${API_URL}/products/scrape/parser?${params.toString()}`, {
          headers: getAuthHeadersRef.current(),
          signal: ac.signal,
        });
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
        const res = await fetch(
          `${API_URL}/product-components/admin/all?productId=${encodeURIComponent(copyFromProductId)}`,
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
        const productRes = await fetch(`${API_URL}/products/${copyFromProductId}`, {
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
          const attrsRes = await fetch(`${API_URL}/categories/${catId}/attributes`, {
            cache: 'no-store',
          });
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
          const componentsRes = await fetch(
            `${API_URL}/product-components/admin/all?productId=${encodeURIComponent(copyFromProductId)}`,
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
        const response = await fetch(`${API_URL}/categories`);
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
        const response = await fetch(`${API_URL}/admin/catalog/suppliers?limit=1000`, {
          headers: getAuthHeaders(),
        });
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
        const response = await fetch(`${API_URL}/admin/partners?limit=1000`, {
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
    const run = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/catalog/manufacturers?limit=500`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data.data) ? data.data : [];
          setManufacturers(
            list.map((m: { id: string; name: string; slug: string; isActive?: boolean }) => ({
              id: m.id,
              name: m.name,
              slug: m.slug,
              isActive: m.isActive !== false,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch manufacturers:', err);
      }
    };
    void run();
  }, [getAuthHeaders]);

  // Подсказки размеров из других товаров этой категории
  useEffect(() => {
    if (!formData.categoryId) {
      setSuggestedSizes([]);
      return;
    }
    let cancelled = false;
    fetch(
      `${API_URL}/products/admin/sizes-by-category?categoryId=${encodeURIComponent(formData.categoryId)}`,
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
    fetch(`${API_URL}/product-components/admin/names-by-category?${params.toString()}`, {
      headers: getAuthHeaders(),
    })
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
        const response = await fetch(`${API_URL}/categories/${formData.categoryId}/attributes`);
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
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError(`Файл ${file.name}: неподдерживаемый формат. Разрешены: JPG, PNG, WebP, GIF`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleImageUpload(e.dataTransfer.files);
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
        if (slug === 'manufacturer') {
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
        videoUrl: formData.videoUrl || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        catalogBadgeIds: formData.catalogBadgeIds,
      };

      const response = await fetch(`${API_URL}/products`, {
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
            const compRes = await fetch(
              `${API_URL}/product-components/product/${createdProduct.id}`,
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
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: revalidatePaths }),
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

  return (
    <div className={styles.page}>
      <div
        className={styles.header}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className={styles.backButton}
            onClick={() => {
              router.push(`${backUrl}?refresh=${Date.now()}`);
            }}
          >
            ← Назад к списку
          </button>
          <h1 className={styles.title}>
            {isCopyMode ? 'Добавление товара (копия)' : 'Добавление товара'}
          </h1>
        </div>
        <button
          type="button"
          className={styles.saveButton}
          disabled={saving}
          onClick={(e) => {
            e.preventDefault();
            if (formRef.current) {
              formRef.current.requestSubmit();
            }
          }}
        >
          {saving ? 'Создание...' : 'Создать товар'}
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.productMeta}>
          <div className={styles.productMetaRow}>
            <span className={styles.productMetaLabel}>Создал / последнее изменение:</span>
            <span className={styles.productMetaDate}>
              После сохранения здесь будут отображаться автор и дата создания.
            </span>
          </div>
        </div>

        {formData.categoryId && formData.supplierId && formData.supplierProductUrl.trim() && (
          <div className={styles.parserNotice} role="status" aria-live="polite">
            {parserLoading ? (
              <>Определяется парсер цены по ссылке…</>
            ) : parserInfo ? (
              <>
                <strong>Парсер цены:</strong> {parserInfo.title}
              </>
            ) : parserBannerError ? (
              <>{parserBannerError}</>
            ) : (
              <>
                Укажите ссылку и уберите фокус с поля (или смените поставщика/категорию), чтобы
                показать парсер. Загрузка цены по ссылке — только по кнопке «Получить цену».
              </>
            )}
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Main Info */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>

            <div className={`${styles.formRow} ${styles.namePartnerRow}`}>
              <div className={`${styles.formGroup} ${styles.nameGroup}`}>
                <label htmlFor="name">Название *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`${styles.input} ${adminProductFieldHighlightClass(reqHighlight.name, styles)}`}
                  placeholder="Введите название товара"
                />
              </div>
              <div className={`${styles.formGroup} ${styles.partnerGroup}`}>
                <label htmlFor="partnerId">Партнёр</label>
                <select
                  id="partnerId"
                  name="partnerId"
                  value={formData.partnerId}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Не выбран</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="slug">URL (slug) *</label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  required
                  className={styles.input}
                  placeholder="url-tovara"
                />
                <p className={styles.hint}>Генерируется автоматически из названия</p>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="sku">Артикул (SKU)</label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleSkuChange}
                  className={styles.input}
                  placeholder="ART-001"
                />
                <p className={styles.hint}>Генерируется автоматически из названия</p>
              </div>
            </div>

            <div className={`${styles.formRow} ${styles.categorySupplierRow}`}>
              <div className={styles.formGroup}>
                <label htmlFor="categoryId">Категория *</label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className={`${styles.select} ${adminProductFieldHighlightClass(reqHighlight.category, styles)}`}
                >
                  <option value="">Выберите категорию</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="supplierId">Поставщик *</label>
                <select
                  id="supplierId"
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  required
                  className={`${styles.select} ${adminProductFieldHighlightClass(reqHighlight.supplier, styles)}`}
                >
                  <option value="">Не выбран</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.commercialName || supplier.legalName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="supplierSku">Артикул товара поставщика</label>
                <input
                  type="text"
                  id="supplierSku"
                  name="supplierSku"
                  value={formData.supplierSku}
                  onChange={handleChange}
                  className={
                    formData.supplierId
                      ? `${styles.input} ${adminProductFieldHighlightClass(reqHighlight.supplierSku, styles)}`
                      : styles.input
                  }
                  placeholder="Код у поставщика"
                  disabled={!formData.supplierId}
                />
              </div>
            </div>

            {formData.supplierId && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="supplierProductUrl">Ссылка на товар поставщика *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="url"
                      id="supplierProductUrl"
                      name="supplierProductUrl"
                      value={formData.supplierProductUrl}
                      onChange={handleChange}
                      onBlur={handleSupplierProductUrlBlur}
                      required
                      className={`${styles.input} ${adminProductFieldHighlightClass(reqHighlight.supplierUrl, styles)}`}
                      placeholder="https://supplier.com/product/123"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.supplierProductUrl) {
                          setError('Введите ссылку на товар поставщика');
                          return;
                        }
                        try {
                          setFetchingPrice(true);
                          setError(null);
                          const response = await fetch(
                            `${API_URL}/products/scrape/price?url=${encodeURIComponent(formData.supplierProductUrl)}&supplierId=${encodeURIComponent(formData.supplierId || '')}&categoryId=${encodeURIComponent(formData.categoryId || '')}`,
                            {
                              headers: getAuthHeaders(),
                            }
                          );
                          if (!response.ok) {
                            const data = await response.json().catch(() => ({}));
                            throw new Error(getApiErrorMessage(data, 'Ошибка получения цены'));
                          }
                          const data = await response.json();
                          setFormData((prev) => ({
                            ...prev,
                            supplierPrice: String(data.price),
                          }));
                          if (
                            data?.parser &&
                            typeof data.parser === 'object' &&
                            typeof data.parser.title === 'string'
                          ) {
                            setParserInfo({
                              key: typeof data.parser.key === 'string' ? data.parser.key : '',
                              title: data.parser.title,
                            });
                            setParserBannerError(null);
                          }
                          const parserTitle =
                            typeof data?.parser?.title === 'string'
                              ? ` (${data.parser.title})`
                              : '';
                          setSuccess(`Цена получена: ${data.price} ₽${parserTitle}`);
                          setTimeout(() => setSuccess(null), 3000);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Ошибка получения цены');
                        } finally {
                          setFetchingPrice(false);
                        }
                      }}
                      disabled={fetchingPrice || !formData.supplierProductUrl}
                      className={styles.button}
                      style={{
                        padding: '0.5rem 1rem',
                        whiteSpace: 'nowrap',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor:
                          fetchingPrice || !formData.supplierProductUrl ? 'not-allowed' : 'pointer',
                        opacity: fetchingPrice || !formData.supplierProductUrl ? 0.5 : 1,
                      }}
                    >
                      {fetchingPrice ? 'Загрузка...' : 'Получить цену'}
                    </button>
                  </div>
                  <p className={styles.hint}>
                    Какой парсер будет использован, показывается после ухода с поля ссылки или при
                    смене поставщика/категории. Цену по ссылке получайте только по кнопке «Получить
                    цену».
                  </p>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="supplierPrice">Цена поставщика</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="supplierPrice"
                      name="supplierPrice"
                      value={formData.supplierPrice}
                      onChange={handlePriceChange}
                      className={styles.input}
                      placeholder="0.00"
                      autoComplete="off"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.supplierPrice) {
                          setError('Сначала укажите цену поставщика');
                          return;
                        }
                        setFormData((prev) => ({
                          ...prev,
                          price: prev.supplierPrice,
                        }));
                        setSuccess('Цена товара обновлена на основе цены поставщика');
                        setTimeout(() => setSuccess(null), 3000);
                      }}
                      disabled={!formData.supplierPrice}
                      className={styles.button}
                      style={{
                        padding: '0.5rem 1rem',
                        whiteSpace: 'nowrap',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: !formData.supplierPrice ? 'not-allowed' : 'pointer',
                        opacity: !formData.supplierPrice ? 0.5 : 1,
                      }}
                      title="Синхронизировать цену товара с ценой поставщика"
                    >
                      Синхронизировать
                    </button>
                  </div>
                  <p className={styles.hint}>
                    Цена товара у поставщика. Может быть заполнена автоматически по ссылке. Нажмите
                    "Синхронизировать" чтобы обновить цену товара.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Stock */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Цена и наличие</h2>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="price">Цена *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handlePriceChange}
                  required
                  className={`${styles.input} ${adminProductFieldHighlightClass(reqHighlight.price, styles)}`}
                  placeholder="0.00"
                  autoComplete="off"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="comparePrice">Старая цена</label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="comparePrice"
                  name="comparePrice"
                  value={formData.comparePrice}
                  onChange={handlePriceChange}
                  className={styles.input}
                  placeholder="0.00"
                  autoComplete="off"
                />
                <p className={styles.hint}>Для отображения скидки</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="stock">Остаток на складе *</label>
              <input
                type="text"
                inputMode="numeric"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleIntegerChange}
                required
                className={`${styles.input} ${adminProductFieldHighlightClass(reqHighlight.stock, styles)}`}
                placeholder="0"
                autoComplete="off"
              />
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>Активен (показывать на сайте)</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sortOrder">Сортировка</label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: parseInt(e.target.value, 10) || 400,
                  }))
                }
                className={styles.input}
                placeholder="400"
              />
              <p className={styles.hint}>
                Чем меньше число, тем выше товар в списке. Товары с одинаковым значением сортируются
                по дате создания.
              </p>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Бэйджи карточки товара</h2>

            <h3
              className={styles.sectionTitle}
              style={{ fontSize: '1rem', marginBottom: '0.5rem' }}
            >
              Справа от фото (текстовые)
            </h3>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                />
                <span>ХИТ</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="isNew"
                  checked={formData.isNew}
                  onChange={handleChange}
                />
                <span>Новинка</span>
              </label>
            </div>
            <p className={styles.hint}>
              Скидка и метка «Видео» на сайте выводятся автоматически при старой цене и ссылке на
              видео.
            </p>

            <h3
              className={styles.sectionTitle}
              style={{ fontSize: '1rem', marginTop: '1.25rem', marginBottom: '0.5rem' }}
            >
              Слева от фото (картинки, не более 5)
            </h3>
            <p className={styles.hint}>
              Изображения — в «Настройки → Бэйджи карточек». Выбрано:{' '}
              {formData.catalogBadgeIds.length} / 5.
            </p>
            <div
              className={styles.attributesList}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '0.35rem',
              }}
            >
              {badgeDefinitions.map((b) => {
                const checked = formData.catalogBadgeIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={styles.checkbox}
                    style={{ alignItems: 'flex-start' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setFormData((prev) => {
                          const i = prev.catalogBadgeIds.indexOf(b.id);
                          if (i >= 0) {
                            return {
                              ...prev,
                              catalogBadgeIds: prev.catalogBadgeIds.filter((id) => id !== b.id),
                            };
                          }
                          if (prev.catalogBadgeIds.length >= 5) {
                            alert('Можно выбрать не более 5 бэйджей слева от фото');
                            return prev;
                          }
                          return { ...prev, catalogBadgeIds: [...prev.catalogBadgeIds, b.id] };
                        });
                      }}
                    />
                    <span>{b.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Product Options */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Варианты исполнения</h2>

            <div className={styles.formGroup}>
              <label>Размеры *</label>
              <div
                className={
                  reqHighlight.sizes
                    ? styles.fieldHighlightBlockFilled
                    : styles.fieldHighlightBlockEmpty
                }
              >
                {suggestedSizes.length > 0 && (
                  <div className={styles.sizesHint}>
                    <span className={styles.sizesHintLabel}>
                      Подсказка: размеры из других товаров категории —
                    </span>
                    <div className={styles.sizesHintChips}>
                      {suggestedSizes.map((size) => {
                        const alreadyAdded = formData.sizes.some(
                          (s) => s.trim().toLowerCase() === size.trim().toLowerCase()
                        );
                        return (
                          <button
                            key={size}
                            type="button"
                            className={styles.sizesHintChip}
                            disabled={alreadyAdded}
                            onClick={() => {
                              setFormData((prev) => {
                                const trimmed = size.trim();
                                if (!trimmed) return prev;
                                const exists = prev.sizes.some(
                                  (s) => s.trim().toLowerCase() === trimmed.toLowerCase()
                                );
                                if (exists) return prev;
                                const base = prev.sizes.filter((s) => s.trim() !== '');
                                return {
                                  ...prev,
                                  sizes: base.length ? [...base, trimmed] : [trimmed],
                                };
                              });
                            }}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className={styles.attributesList}>
                  {(formData.sizes.length > 0 ? formData.sizes : ['']).map((size, index) => (
                    <div key={`size-${index}`} className={styles.attributeRow}>
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const nextSizes = prev.sizes.length > 0 ? [...prev.sizes] : [''];
                            nextSizes[index] = value;
                            return { ...prev, sizes: nextSizes };
                          });
                        }}
                        className={styles.input}
                        placeholder="60x200"
                        aria-label={`Размер ${index + 1}`}
                      />
                      {formData.sizes.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeAttrButton}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              sizes: prev.sizes.filter((_, i) => i !== index),
                            }))
                          }
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.addAttrButton}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sizes: [...prev.sizes, ''],
                    }))
                  }
                >
                  + Добавить размер
                </button>
                <p className={styles.hint}>
                  Добавьте один или несколько размеров. Если не указано, параметр не будет
                  отображаться в публичке.
                </p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="openingSide">Сторона открывания</label>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.openingSide.includes('правое')}
                    onChange={(e) => {
                      setFormData((prev) => {
                        const sides = e.target.checked
                          ? [...prev.openingSide, 'правое']
                          : prev.openingSide.filter((s) => s !== 'правое');
                        return { ...prev, openingSide: sides };
                      });
                    }}
                  />
                  <span>Правое</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.openingSide.includes('левое')}
                    onChange={(e) => {
                      setFormData((prev) => {
                        const sides = e.target.checked
                          ? [...prev.openingSide, 'левое']
                          : prev.openingSide.filter((s) => s !== 'левое');
                        return { ...prev, openingSide: sides };
                      });
                    }}
                  />
                  <span>Левое</span>
                </label>
              </div>
              <p className={styles.hint}>
                Выберите доступные стороны открывания. Если ничего не выбрано, параметр не будет
                отображаться в публичке.
              </p>
            </div>
          </div>

          {/* SEO */}
          <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
            <h2 className={styles.sectionTitle}>SEO</h2>

            <div className={styles.formGroup}>
              <label htmlFor="seoTitle">SEO заголовок</label>
              <input
                type="text"
                id="seoTitle"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleSeoTitleChange}
                className={styles.input}
                placeholder="Название товара - Категория | Сайт"
                maxLength={70}
              />
              <p className={styles.hint}>
                Генерируется автоматически. Рекомендуемая длина: до 70 символов (
                {formData.seoTitle.length}/70)
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="seoDescription">SEO описание</label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleSeoDescriptionChange}
                rows={3}
                className={styles.textarea}
                placeholder="Купить [товар] в категории [категория]. Гарантия качества."
                maxLength={160}
              />
              <p className={styles.hint}>
                Генерируется автоматически. Рекомендуемая длина: до 160 символов (
                {formData.seoDescription.length}/160)
              </p>
            </div>
          </div>

          {/* Images */}
          <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
            <h2 className={styles.sectionTitle}>Изображения *</h2>

            {imageError && <div className={styles.imageError}>{imageError}</div>}

            <div
              className={
                reqHighlight.images
                  ? styles.fieldHighlightBlockFilled
                  : styles.fieldHighlightBlockEmpty
              }
            >
              {/* Drag & Drop zone */}
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className={styles.fileInput}
                />
                <div className={styles.dropZoneContent}>
                  <span className={styles.dropZoneIcon}>📷</span>
                  <p className={styles.dropZoneText}>
                    Перетащите изображения сюда или{' '}
                    <span className={styles.dropZoneLink}>выберите файлы</span>
                  </p>
                  <p className={styles.dropZoneHint}>JPG, PNG, WebP, GIF до 5MB</p>
                </div>
              </div>

              {/* Add by URL */}
              <button type="button" className={styles.addUrlButton} onClick={handleImageUrlAdd}>
                🔗 Добавить по URL
              </button>

              {/* Images grid */}
              {formData.images.length > 0 ? (
                <div className={styles.imagesGrid}>
                  {formData.images.map((img, index) => (
                    <div key={index} className={styles.imageItem}>
                      <img src={img} alt={`Изображение ${index + 1}`} />
                      {index === 0 && <span className={styles.mainImageBadge}>Главное</span>}
                      <div className={styles.imageActions}>
                        <button
                          type="button"
                          className={styles.imageActionBtn}
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          title="Переместить влево"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className={styles.imageActionBtn}
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === formData.images.length - 1}
                          title="Переместить вправо"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className={`${styles.imageActionBtn} ${styles.imageDeleteBtn}`}
                          onClick={() => removeImage(index)}
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noImages}>Изображения не добавлены</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
            <h2 className={styles.sectionTitle}>Описание</h2>

            <div className={styles.formGroup}>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={8}
                className={styles.textarea}
                placeholder="Подробное описание товара..."
              />
            </div>
          </div>

          {/* Attributes / Characteristics */}
          <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
            <h2 className={styles.sectionTitle}>Характеристики товара</h2>

            <div className={styles.attributesGrid}>
              {/* Category attributes */}
              <div className={styles.attributesSection}>
                <h3 className={styles.attributesSubtitle}>Атрибуты категории</h3>
                {categoryAttributes.length > 0 ? (
                  <div className={styles.attributesList}>
                    {categoryAttributes.map((ca) => {
                      const slug = ca.attribute.slug;
                      const rawAttr = formData.attributes[slug];
                      const isManufacturerAttr = slug === 'manufacturer';
                      const attrRequired = Boolean(ca.isRequired);
                      const attrValueFilled = isManufacturerAttr
                        ? Boolean(formData.manufacturerId?.trim())
                        : categoryAttributeValueFilled(ca.attribute.type, rawAttr);
                      const showClear = isManufacturerAttr
                        ? Boolean(formData.manufacturerId?.trim())
                        : ca.attribute.type === 'MULTI_SELECT'
                          ? multiSelectHasSelection(rawAttr)
                          : ca.attribute.type === 'BOOLEAN'
                            ? Boolean(rawAttr)
                            : Boolean(rawAttr);
                      const isSelectFromList =
                        ca.attribute.type === 'SELECT' ||
                        (ca.attribute.type === 'COLOR' && ca.attribute.values.length > 0);

                      return (
                        <div
                          key={ca.id}
                          className={
                            ca.attribute.type === 'MULTI_SELECT'
                              ? `${styles.attributeRow} ${styles.attributeRowMulti}`
                              : styles.attributeRow
                          }
                        >
                          <label className={styles.attributeLabel}>
                            {ca.attribute.name}
                            {ca.attribute.unit && (
                              <span className={styles.unit}>({ca.attribute.unit})</span>
                            )}
                          </label>
                          <div className={styles.attributeInput}>
                            {isManufacturerAttr ? (
                              <select
                                id={`attr-manufacturer-${ca.id}`}
                                value={formData.manufacturerId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const mName = manufacturers.find((m) => m.id === id)?.name ?? '';
                                  setFormData((prev) => ({
                                    ...prev,
                                    manufacturerId: id,
                                    attributes: {
                                      ...prev.attributes,
                                      manufacturer: mName,
                                    },
                                  }));
                                }}
                                className={
                                  attrRequired
                                    ? `${styles.select} ${
                                        formData.manufacturerId?.trim()
                                          ? styles.fieldHighlightFilled
                                          : styles.fieldHighlightEmpty
                                      }`
                                    : styles.select
                                }
                              >
                                <option value="">Выберите значение</option>
                                {manufacturers.map((m) => (
                                  <option key={m.id} value={m.id} disabled={!m.isActive}>
                                    {m.name}
                                    {!m.isActive ? ' (неактивен)' : ''}
                                  </option>
                                ))}
                              </select>
                            ) : ca.attribute.type === 'BOOLEAN' ? (
                              <select
                                value={rawAttr || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    attributes: {
                                      ...prev.attributes,
                                      [slug]: e.target.value,
                                    },
                                  }))
                                }
                                className={
                                  attrRequired
                                    ? `${styles.select} ${
                                        attrValueFilled
                                          ? styles.fieldHighlightFilled
                                          : styles.fieldHighlightEmpty
                                      }`
                                    : styles.select
                                }
                              >
                                <option value="">Не указано</option>
                                <option value="Да">Да</option>
                                <option value="Нет">Нет</option>
                              </select>
                            ) : ca.attribute.type === 'MULTI_SELECT' ? (
                              <div
                                className={
                                  attrRequired
                                    ? `${styles.multiSelectOptions} ${
                                        attrValueFilled
                                          ? styles.fieldHighlightBlockFilled
                                          : styles.fieldHighlightBlockEmpty
                                      }`
                                    : styles.multiSelectOptions
                                }
                              >
                                {ca.attribute.values.length === 0 ? (
                                  <span className={styles.attrListHint}>
                                    Нет вариантов списка — задайте их в настройках категории
                                    (Каталог → Категории).
                                  </span>
                                ) : (
                                  ca.attribute.values.map((v) => {
                                    const selected = decodeMultiSelectStored(rawAttr);
                                    const checked = selected.includes(v.value);
                                    return (
                                      <label key={v.id} className={styles.multiSelectOptionLabel}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? [...new Set([...selected, v.value])]
                                              : selected.filter((x) => x !== v.value);
                                            setFormData((prev) => ({
                                              ...prev,
                                              attributes: {
                                                ...prev.attributes,
                                                [slug]: encodeMultiSelectValues(next),
                                              },
                                            }));
                                          }}
                                        />
                                        <span>{v.value}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            ) : isSelectFromList ? (
                              <select
                                disabled={ca.attribute.values.length === 0}
                                value={rawAttr || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    attributes: {
                                      ...prev.attributes,
                                      [slug]: e.target.value,
                                    },
                                  }))
                                }
                                className={
                                  attrRequired
                                    ? `${styles.select} ${
                                        attrValueFilled
                                          ? styles.fieldHighlightFilled
                                          : styles.fieldHighlightEmpty
                                      }`
                                    : styles.select
                                }
                              >
                                <option value="">
                                  {ca.attribute.values.length === 0
                                    ? 'Нет вариантов — задайте в Каталог → Категории'
                                    : 'Выберите значение'}
                                </option>
                                {ca.attribute.values.map((v) => (
                                  <option key={v.id} value={v.value}>
                                    {v.value}
                                  </option>
                                ))}
                              </select>
                            ) : ca.attribute.type === 'NUMBER' ? (
                              <input
                                type="number"
                                value={rawAttr || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    attributes: {
                                      ...prev.attributes,
                                      [slug]: e.target.value,
                                    },
                                  }))
                                }
                                className={
                                  attrRequired
                                    ? `${styles.input} ${
                                        attrValueFilled
                                          ? styles.fieldHighlightFilled
                                          : styles.fieldHighlightEmpty
                                      }`
                                    : styles.input
                                }
                                step="any"
                              />
                            ) : (
                              <input
                                type="text"
                                value={rawAttr || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    attributes: {
                                      ...prev.attributes,
                                      [slug]: e.target.value,
                                    },
                                  }))
                                }
                                className={
                                  attrRequired
                                    ? `${styles.input} ${
                                        attrValueFilled
                                          ? styles.fieldHighlightFilled
                                          : styles.fieldHighlightEmpty
                                      }`
                                    : styles.input
                                }
                              />
                            )}
                            {showClear && (
                              <button
                                type="button"
                                className={styles.clearAttrButton}
                                onClick={() =>
                                  setFormData((prev) => {
                                    if (slug === 'manufacturer') {
                                      return {
                                        ...prev,
                                        manufacturerId: '',
                                        attributes: { ...prev.attributes, manufacturer: '' },
                                      };
                                    }
                                    const newAttrs = { ...prev.attributes };
                                    delete newAttrs[slug];
                                    return { ...prev, attributes: newAttrs };
                                  })
                                }
                                title="Очистить"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.noAttributes}>
                    {formData.categoryId
                      ? 'Нет атрибутов для выбранной категории'
                      : 'Выберите категорию, чтобы увидеть атрибуты'}
                  </p>
                )}
              </div>

              {/* Custom attributes */}
              <div className={styles.attributesSection}>
                <h3 className={styles.attributesSubtitle}>
                  Дополнительные характеристики
                  <span className={styles.customAttrHint}>(специфичные для этого товара)</span>
                </h3>

                {customAttributes.length > 0 && (
                  <div className={styles.attributesList}>
                    {customAttributes.map((attr, index) => (
                      <div key={index} className={styles.attributeRow}>
                        <input
                          type="text"
                          value={attr.key}
                          onChange={(e) => {
                            const newCustom = [...customAttributes];
                            newCustom[index].key = e.target.value;
                            setCustomAttributes(newCustom);
                          }}
                          className={styles.input}
                          placeholder="Название"
                        />
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) => {
                            const newCustom = [...customAttributes];
                            newCustom[index].value = e.target.value;
                            setCustomAttributes(newCustom);
                          }}
                          className={styles.input}
                          placeholder="Значение"
                        />
                        <button
                          type="button"
                          className={styles.removeAttrButton}
                          onClick={() => {
                            setCustomAttributes(customAttributes.filter((_, i) => i !== index));
                          }}
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new custom attribute */}
                <div className={styles.addAttrRow}>
                  <input
                    type="text"
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    className={styles.input}
                    placeholder="Название характеристики"
                  />
                  <input
                    type="text"
                    value={newAttrValue}
                    onChange={(e) => setNewAttrValue(e.target.value)}
                    className={styles.input}
                    placeholder="Значение"
                  />
                  <button
                    type="button"
                    className={styles.addAttrButton}
                    onClick={() => {
                      if (newAttrKey.trim()) {
                        setCustomAttributes([
                          ...customAttributes,
                          { key: newAttrKey.trim(), value: newAttrValue },
                        ]);
                        setNewAttrKey('');
                        setNewAttrValue('');
                      }
                    }}
                    disabled={!newAttrKey.trim()}
                  >
                    + Добавить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isInteriorDoorsCategorySelected && (
          <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
            <h2 className={styles.sectionTitle}>Комплектующие</h2>
            <p className={styles.hint}>
              Для категории «Межкомнатные двери» и любой её дочерней категории комплектующие можно
              добавить сразу при создании. Они будут созданы вместе с товаром.
            </p>
            {componentsDraftError && <p className={styles.imageError}>{componentsDraftError}</p>}
            {suggestedComponentNames.length > 0 && (
              <div className={styles.sizesHint}>
                <span className={styles.sizesHintLabel}>
                  Подсказка: наименования из других товаров категории -
                </span>
                <div className={styles.sizesHintChips}>
                  {suggestedComponentNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={styles.sizesHintChip}
                      onClick={() =>
                        setNewComponentDraft((prev) => ({
                          ...prev,
                          name,
                        }))
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div className={styles.formGroup}>
                <label htmlFor="componentDraftName">Название</label>
                <input
                  id="componentDraftName"
                  className={styles.input}
                  placeholder="Название"
                  list="component-names-create-datalist"
                  value={newComponentDraft.name}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <datalist id="component-names-create-datalist">
                {suggestedComponentNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <div className={styles.formGroup}>
                <label htmlFor="componentDraftType">Тип</label>
                <input
                  id="componentDraftType"
                  className={styles.input}
                  placeholder="Тип"
                  value={newComponentDraft.type}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({ ...prev, type: e.target.value }))
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="componentDraftPrice">Цена</label>
                <input
                  id="componentDraftPrice"
                  className={styles.input}
                  placeholder="Цена"
                  inputMode="decimal"
                  value={newComponentDraft.price}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({
                      ...prev,
                      price: e.target.value.replace(/[^0-9.,]/g, ''),
                    }))
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="componentDraftImage">Изображение (URL/Base64)</label>
                <input
                  id="componentDraftImage"
                  className={styles.input}
                  placeholder="URL/Base64 изображения (опционально)"
                  value={newComponentDraft.image}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({ ...prev, image: e.target.value }))
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="componentDraftStock">Остаток</label>
                <input
                  id="componentDraftStock"
                  className={styles.input}
                  placeholder="Остаток"
                  inputMode="numeric"
                  value={String(newComponentDraft.stock)}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({
                      ...prev,
                      stock: parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10),
                    }))
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="componentDraftSortOrder">Сортировка</label>
                <input
                  id="componentDraftSortOrder"
                  className={styles.input}
                  placeholder="Сортировка"
                  inputMode="numeric"
                  value={String(newComponentDraft.sortOrder)}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({
                      ...prev,
                      sortOrder: parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10),
                    }))
                  }
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={newComponentDraft.isActive}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                />
                Активно
              </label>
              <button type="button" className={styles.addAttrButton} onClick={addDraftComponent}>
                + Добавить комплектующее
              </button>
            </div>

            {componentsToCopy.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                {componentsToCopy.map((component, index) => (
                  <div
                    key={`${component.name}-${component.type}-${index}`}
                    className={componentStyles.componentItem}
                  >
                    {editingComponentIndex === index ? (
                      <div className={componentStyles.componentInfo}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: '0.75rem',
                          }}
                        >
                          <div className={componentStyles.inlineField}>
                            <label className={componentStyles.inlineLabel}>Наименование</label>
                            <input
                              className={componentStyles.inlineInput}
                              value={editingComponentDraft.name}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Название"
                            />
                          </div>
                          <div className={componentStyles.inlineField}>
                            <label className={componentStyles.inlineLabel}>Тип</label>
                            <input
                              className={componentStyles.inlineInput}
                              value={editingComponentDraft.type}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  type: e.target.value,
                                }))
                              }
                              placeholder="Тип"
                            />
                          </div>
                          <div className={componentStyles.inlineField}>
                            <label className={componentStyles.inlineLabel}>Цена</label>
                            <input
                              className={componentStyles.inlineInput}
                              inputMode="decimal"
                              value={editingComponentDraft.price}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  price: e.target.value.replace(/[^0-9.,]/g, ''),
                                }))
                              }
                              placeholder="Цена"
                            />
                          </div>
                          <div className={componentStyles.inlineField}>
                            <label className={componentStyles.inlineLabel}>Изображение</label>
                            <input
                              className={componentStyles.inlineInput}
                              value={editingComponentDraft.image}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  image: e.target.value,
                                }))
                              }
                              placeholder="URL/Base64 изображения (опционально)"
                            />
                          </div>
                          <div className={componentStyles.inlineField}>
                            <label className={componentStyles.inlineLabel}>Склад</label>
                            <input
                              className={componentStyles.inlineInput}
                              inputMode="numeric"
                              value={String(editingComponentDraft.stock)}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  stock: parseInt(e.target.value.replace(/[^0-9]/g, '') || '0', 10),
                                }))
                              }
                              placeholder="Остаток"
                            />
                          </div>
                          <div className={componentStyles.inlineField}>
                            <label className={componentStyles.inlineLabel}>Сортировка</label>
                            <input
                              className={componentStyles.inlineInput}
                              inputMode="numeric"
                              value={String(editingComponentDraft.sortOrder)}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  sortOrder: parseInt(
                                    e.target.value.replace(/[^0-9]/g, '') || '0',
                                    10
                                  ),
                                }))
                              }
                              placeholder="Сортировка"
                            />
                          </div>
                        </div>
                        <div className={componentStyles.componentActions}>
                          <label className={componentStyles.inlineCheckbox}>
                            <input
                              type="checkbox"
                              checked={editingComponentDraft.isActive}
                              onChange={(e) =>
                                setEditingComponentDraft((prev) => ({
                                  ...prev,
                                  isActive: e.target.checked,
                                }))
                              }
                            />
                            Активно
                          </label>
                          <button
                            type="button"
                            className={componentStyles.saveButton}
                            onClick={saveEditDraftComponent}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className={componentStyles.cancelButton}
                            onClick={cancelEditDraftComponent}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={componentStyles.componentInfo}>
                          <div className={componentStyles.componentInfoRow}>
                            <span className={componentStyles.componentName}>{component.name}</span>
                            <span className={componentStyles.componentType}>{component.type}</span>
                            <span className={componentStyles.componentPrice}>
                              {component.price} ₽
                            </span>
                            <span className={componentStyles.componentStock}>
                              Склад: {component.stock} шт.
                            </span>
                            <span className={componentStyles.componentSortOrder}>
                              Сортировка: {component.sortOrder}
                            </span>
                            {!component.isActive && (
                              <span className={componentStyles.inactiveBadge}>Неактивен</span>
                            )}
                          </div>
                        </div>
                        <div className={componentStyles.componentActions}>
                          <button
                            type="button"
                            className={componentStyles.editButton}
                            onClick={() => startEditDraftComponent(index)}
                            title="Редактировать комплектующее"
                            aria-label="Редактировать комплектующее"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={componentStyles.deleteButton}
                            onClick={() => removeDraftComponent(index)}
                            title="Удалить комплектующее"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.formActions}>
          <div className={styles.formActionsRight}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                router.push(`${backUrl}?refresh=${Date.now()}`);
              }}
            >
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Создание...' : 'Создать товар'}
            </button>
          </div>
        </div>
      </form>

      <ImageUrlModal
        isOpen={imageUrlModalOpen}
        onClose={() => setImageUrlModalOpen(false)}
        onConfirm={(url) => {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images, url],
          }));
        }}
      />

      {/* Кнопка "Назад к списку" в самом низу */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
        <button
          type="button"
          className={styles.backButtonBottom}
          onClick={() => {
            router.push(`${backUrl}?refresh=${Date.now()}`);
          }}
        >
          ← Назад к списку
        </button>
      </div>

      {/* Toast notifications */}
      {success && (
        <div className={`${styles.toast} ${styles.toastSuccess}`}>
          <span className={styles.toastIcon}>✓</span>
          <span className={styles.toastMessage}>{success}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setSuccess(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className={`${styles.toast} ${styles.toastError}`}>
          <span className={styles.toastIcon}>⚠</span>
          <span className={styles.toastMessage}>{error}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setError(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
