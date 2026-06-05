'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { fetchAdminCanvasTypesList } from '@/shared/api/admin-canvas-types';
import { fetchAdminCoatingMaterialsList } from '@/shared/api/admin-coating-materials';
import { fetchAdminDoorThicknessesList } from '@/shared/api/admin-door-thicknesses';
import { fetchAdminManufacturersList } from '@/shared/api/admin-manufacturers';
import { fetchAdminWeatherstripsList } from '@/shared/api/admin-weatherstrips';
import { getApiErrorMessage, isNetworkFetchError } from '@/shared/lib/api-error';
import { apiFetch } from '@/shared/lib/api-fetch';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';

import { ImageUrlModal } from './ImageUrlModal';
import { ProductComponentsSection } from './ProductComponentsSection';
import styles from './ProductEditPage.module.css';
import { ProductReviewsSection } from './ProductReviewsSection';
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
import {
  decodeMultiSelectStored,
  encodeMultiSelectValues,
  multiSelectHasSelection,
} from './category-attribute-multiselect';
import { findInteriorDoorsRootForSelection } from './interior-doors-category-utils';
import {
  adminProductFieldHighlightClass,
  categoryAttributeValueFilled,
  validateAdminProductRequiredFields,
} from './product-form-required-fields';
import { buildProductsListBackUrl } from './products-list-filters-storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const CARD_SECTIONS_STORAGE_KEY = 'admin_product_card_template_sections';
const DEFAULT_CARD_SECTIONS = [
  'main',
  'pricing',
  'cardBadges',
  'variants',
  'cardVariants',
  'seo',
  'images',
  'video',
  'description',
  'attributes',
  'components',
];

function getCardSections(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CARD_SECTIONS;
  try {
    const saved = localStorage.getItem(CARD_SECTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CARD_SECTIONS;
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
  return title.substring(0, 70);
}

// Функция генерации SEO описания
function generateSeoDescription(productName: string, categoryName: string): string {
  if (!productName) return '';
  const categoryText = categoryName ? ` в категории ${categoryName}` : '';
  const description = `Купить ${productName}${categoryText}. Гарантия качества. ${SITE_NAME}`;
  return description.substring(0, 160);
}

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

interface ParserInfo {
  key: string;
  title: string;
}

interface ProductEditPageProps {
  productId: string;
}

export function ProductEditPage({ productId }: ProductEditPageProps) {
  const router = useRouter();
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
  const [cardSections, setCardSections] = useState<string[]>(DEFAULT_CARD_SECTIONS);
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
    apiFetch(`${API_URL}/product-card-badges/definitions`, { cache: 'no-store' })
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
        const response = await apiFetch(`${API_URL}/products/scrape/parser?${params.toString()}`, {
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

  // Атрибуты категории и товара
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const cardVariantFileInputRef = useRef<HTMLInputElement>(null);
  const [cardVariantUploadIndex, setCardVariantUploadIndex] = useState<number | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
        const response = await apiFetch(`${API_URL}/categories`);
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
        const response = await apiFetch(`${API_URL}/admin/catalog/suppliers?limit=1000`, {
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
        const response = await apiFetch(`${API_URL}/admin/partners?limit=1000`, {
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
        const productUrl = `${API_URL}/products/${encodeURIComponent(productId)}?t=${Date.now()}`;
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
        let loadedCategoryAttributes: CategoryAttribute[] = [];
        const nameToSlugMap: Record<string, string> = {};
        const categoryAttrNames: string[] = [];
        const categoryAttrSlugs: string[] = [];

        if (product.categoryId) {
          try {
            const attrsUrl = `${API_URL}/categories/${encodeURIComponent(product.categoryId)}/attributes?t=${Date.now()}`;
            const attrsResponse = await apiFetch(attrsUrl, {
              cache: 'no-store',
              signal: ac.signal,
            });
            if (!active) return;
            if (attrsResponse.ok) {
              const attrsData: CategoryAttribute[] = await attrsResponse.json();
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

  // Атрибуты категории при смене категории (обязательность и варианты списков — как в настройках категории)
  useEffect(() => {
    const fetchCategoryAttributes = async () => {
      if (!formData.categoryId) {
        setCategoryAttributes([]);
        return;
      }
      try {
        const response = await apiFetch(
          `${API_URL}/categories/${encodeURIComponent(formData.categoryId)}/attributes?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (response.ok) {
          const data: CategoryAttribute[] = await response.json();
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
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError(`Файл ${file.name}: неподдерживаемый формат. Разрешены: JPG, PNG, WebP, GIF`);
        continue;
      }

      // Проверка размера
      if (file.size > MAX_FILE_SIZE) {
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCardVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || cardVariantUploadIndex === null) return;
    const file = files[0];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Разрешены форматы: JPG, PNG, WebP, GIF');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('Размер файла не более 5MB');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setFormData((prev) => {
        const next = [...prev.cardVariants];
        if (next[cardVariantUploadIndex] === undefined) {
          next[cardVariantUploadIndex] = {
            name: '',
            price: '',
            image: '',
            size: '',
            color: '',
            extraOption: '',
            sortOrder: cardVariantUploadIndex,
          };
        }
        next[cardVariantUploadIndex] = { ...next[cardVariantUploadIndex], image: base64 };
        return { ...prev, cardVariants: next };
      });
      setImageError(null);
    } catch {
      setImageError('Ошибка загрузки файла');
    }
    setCardVariantUploadIndex(null);
    e.target.value = '';
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

      const response = await apiFetch(`${API_URL}/products/${productId}`, {
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

      // Сброс кэша публичных страниц (товар и каталог), чтобы изменения отображались без двойной перезагрузки
      const slug = formData.slug?.trim();
      if (slug) {
        apiFetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: [`/product/${slug}`, { path: '/catalog/products', type: 'layout' as const }],
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

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка товара...</p>
        </div>
      </div>
    );
  }

  if (productNotFound) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h2>Товар не найден</h2>
          <p>Товар с ID {productId} не существует или был удалён.</p>
          <button className={styles.backButton} onClick={navigateBackToProductsList}>
            ← Вернуться к списку товаров
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div
        className={styles.header}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className={styles.backButton} onClick={navigateBackToProductsList}>
            ← Назад к списку
          </button>
          <h1 className={styles.title}>Редактирование товара</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`${styles.cancelButton} ${styles.copyProductButton}`}
            onClick={() =>
              router.push(
                `/admin/catalog/products/new?copyFrom=${productId}${
                  fromCategory ? `&fromCategory=${fromCategory}` : ''
                }`
              )
            }
            aria-label="Скопировать товар"
          >
            <CopyIcon />
            Скопировать
          </button>
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
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.productMeta}>
          <div className={styles.productMetaRow}>
            <span className={styles.productMetaLabel}>Создал:</span>
            <span>
              {productMeta.createdBy ?? '—'}
              {productMeta.createdAt && (
                <span className={styles.productMetaDate}>
                  {' '}
                  {new Date(productMeta.createdAt).toLocaleString('ru-RU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </span>
          </div>
          <div className={styles.productMetaRow}>
            <span className={styles.productMetaLabel}>Последнее изменение:</span>
            <span>
              {productMeta.updatedBy ?? '—'}
              {productMeta.updatedAt && (
                <span className={styles.productMetaDate}>
                  {' '}
                  {new Date(productMeta.updatedAt).toLocaleString('ru-RU', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
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
          {showSection('main') && (
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
                  />
                  <p className={styles.hint}>Генерируется автоматически при изменении названия</p>
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
                  />
                  <p className={styles.hint}>Генерируется автоматически при изменении названия</p>
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
                            const response = await apiFetch(
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
                          backgroundColor: 'var(--admin-info-strong)',
                          color: 'var(--admin-text-inverse)',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor:
                            fetchingPrice || !formData.supplierProductUrl
                              ? 'not-allowed'
                              : 'pointer',
                          opacity: fetchingPrice || !formData.supplierProductUrl ? 0.5 : 1,
                        }}
                      >
                        {fetchingPrice ? 'Загрузка...' : 'Получить цену'}
                      </button>
                    </div>
                    <p className={styles.hint}>
                      Какой парсер будет использован, показывается после ухода с поля ссылки или при
                      смене поставщика/категории. Цену по ссылке получайте только по кнопке
                      «Получить цену».
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
                          backgroundColor: 'var(--admin-success-emerald)',
                          color: 'var(--admin-text-inverse)',
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
                      Цена товара у поставщика. Может быть заполнена автоматически по ссылке.
                      Нажмите "Синхронизировать" чтобы обновить цену товара.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing & Stock */}
          {showSection('pricing') && (
            <div
              className={`${styles.formSection} ${styles.formSectionFullWidth} ${styles.formSectionCompact} ${styles.formSectionPricingTight}`}
            >
              <h2 className={styles.sectionTitle}>Цена и наличие</h2>

              <div className={styles.pricingOneRow}>
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
                  <label htmlFor="comparePrice" title="Для скидки на витрине">
                    Старая цена
                  </label>
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
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="stock" title="Остаток на складе">
                    Остаток *
                  </label>
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
                <div className={styles.formGroup}>
                  <label htmlFor="sortOrder" title="Меньше число — выше в списке">
                    Сортировка
                  </label>
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
                </div>
                <div
                  className={`${styles.checkboxGroup} ${styles.checkboxGroupRow} ${styles.pricingInlineChecks}`}
                >
                  <label
                    className={styles.checkbox}
                    title="При нулевом остатке на витрине — «Под заказ»; при остатке больше нуля — «В наличии»."
                  >
                    <input
                      type="checkbox"
                      checked={formData.onOrder}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, onOrder: e.target.checked }))
                      }
                    />
                    <span>Под заказ</span>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                    />
                    <span>Активен (на сайте)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {showSection('cardBadges') && (
            <div
              className={`${styles.formSection} ${styles.formSectionFullWidth} ${styles.formSectionCompact}`}
            >
              <h2 className={styles.sectionTitle}>Бэйджи карточки товара</h2>

              <h3 className={`${styles.subsectionTitle} ${styles.subsectionTitleFirst}`}>
                Справа от фото (текстовые)
              </h3>
              <div
                className={`${styles.checkboxGroup} ${styles.checkboxGroupRow} ${styles.textBadgesRow}`}
              >
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
              <p className={styles.hintTight}>
                Скидка и «Видео» на сайте — автоматически при старой цене и ссылке на видео.
              </p>

              <h3 className={`${styles.subsectionTitle} ${styles.subsectionTitleSpaced}`}>
                Слева от фото (картинки, не более 5)
              </h3>
              <p className={styles.hintTight}>
                PNG или JPG в «Настройки → Бэйджи карточек». Выбрано:{' '}
                {formData.catalogBadgeIds.length} / 5.
              </p>
              <div className={styles.cardBadgesPickGrid}>
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
          )}

          {/* Product Options */}
          {showSection('variants') && (
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
                  <div className={`${styles.attributesList} ${styles.sizesListTwoCol}`}>
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
                <div
                  className={`${styles.checkboxGroup} ${styles.checkboxGroupRow} ${styles.openingSideRow}`}
                >
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
          )}

          {/* Схожие товары в карточке (до 5) */}
          {showSection('cardVariants') && (
            <div className={styles.formSection}>
              <input
                ref={cardVariantFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={styles.fileInput}
                style={{ display: 'none' }}
                onChange={handleCardVariantImageUpload}
              />
              <h2 className={styles.sectionTitle}>Схожие товары в карточке</h2>
              <p className={styles.hint} style={{ marginBottom: '1rem' }}>
                До 5 вариантов в одной карточке (как на Wildberries/Озон): отличаются ценой,
                размером, фото, наименованием, цветом, доп. опцией. Пользователь выбирает нужный
                вариант прямо в карточке.
              </p>
              {(formData.cardVariants.length > 0
                ? formData.cardVariants
                : [
                    {
                      name: '',
                      price: '',
                      image: '',
                      size: '',
                      color: '',
                      extraOption: '',
                      sortOrder: 0,
                    },
                  ]
              ).map((variant, index) => (
                <div key={`card-variant-${index}`} className={styles.cardVariantBlock}>
                  <h3 className={styles.cardVariantBlockTitle}>Вариант {index + 1}</h3>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup} style={{ flex: 2 }}>
                      <label>Наименование *</label>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => {
                          const next = [...formData.cardVariants];
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
                          next[index] = { ...next[index], name: e.target.value };
                          setFormData((prev) => ({ ...prev, cardVariants: next }));
                        }}
                        className={styles.input}
                        placeholder="Например: Дверь белая 60×200"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Цена *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={variant.price}
                        onChange={(e) => {
                          const v = e.target.value
                            .replace(/[^0-9.]/g, '')
                            .replace(/(\..*)\./g, '$1');
                          const next = [...formData.cardVariants];
                          if (next[index] === undefined)
                            next[index] = {
                              name: '',
                              price: '',
                              image: '',
                              size: '',
                              color: '',
                              extraOption: '',
                              sortOrder: index,
                            };
                          next[index] = { ...next[index], price: v };
                          setFormData((prev) => ({ ...prev, cardVariants: next }));
                        }}
                        className={styles.input}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Фото</label>
                    <div className={styles.cardVariantImageRow}>
                      <input
                        type="text"
                        value={variant.image}
                        onChange={(e) => {
                          const next = [...formData.cardVariants];
                          if (next[index] === undefined)
                            next[index] = {
                              name: '',
                              price: '',
                              image: '',
                              size: '',
                              color: '',
                              extraOption: '',
                              sortOrder: index,
                            };
                          next[index] = { ...next[index], image: e.target.value };
                          setFormData((prev) => ({ ...prev, cardVariants: next }));
                        }}
                        className={styles.input}
                        placeholder="URL или загрузите файл"
                      />
                      <button
                        type="button"
                        className={styles.cardVariantUploadBtn}
                        onClick={() => {
                          setCardVariantUploadIndex(index);
                          cardVariantFileInputRef.current?.click();
                        }}
                      >
                        Загрузить фото
                      </button>
                    </div>
                    {variant.image && (
                      <div className={styles.cardVariantImagePreview}>
                        <img src={variant.image} alt="" />
                      </div>
                    )}
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Размер</label>
                      <input
                        type="text"
                        value={variant.size}
                        onChange={(e) => {
                          const next = [...formData.cardVariants];
                          if (next[index] === undefined)
                            next[index] = {
                              name: '',
                              price: '',
                              image: '',
                              size: '',
                              color: '',
                              extraOption: '',
                              sortOrder: index,
                            };
                          next[index] = { ...next[index], size: e.target.value };
                          setFormData((prev) => ({ ...prev, cardVariants: next }));
                        }}
                        className={styles.input}
                        placeholder="60×200"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Цвет</label>
                      <input
                        type="text"
                        value={variant.color}
                        onChange={(e) => {
                          const next = [...formData.cardVariants];
                          if (next[index] === undefined)
                            next[index] = {
                              name: '',
                              price: '',
                              image: '',
                              size: '',
                              color: '',
                              extraOption: '',
                              sortOrder: index,
                            };
                          next[index] = { ...next[index], color: e.target.value };
                          setFormData((prev) => ({ ...prev, cardVariants: next }));
                        }}
                        className={styles.input}
                        placeholder="Белый"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Доп. опция</label>
                      <input
                        type="text"
                        value={variant.extraOption}
                        onChange={(e) => {
                          const next = [...formData.cardVariants];
                          if (next[index] === undefined)
                            next[index] = {
                              name: '',
                              price: '',
                              image: '',
                              size: '',
                              color: '',
                              extraOption: '',
                              sortOrder: index,
                            };
                          next[index] = { ...next[index], extraOption: e.target.value };
                          setFormData((prev) => ({ ...prev, cardVariants: next }));
                        }}
                        className={styles.input}
                        placeholder="С подсветкой"
                      />
                    </div>
                  </div>
                  {formData.cardVariants.length > 0 && (
                    <button
                      type="button"
                      className={styles.cardVariantRemoveButton}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          cardVariants: prev.cardVariants.filter((_, i) => i !== index),
                        }))
                      }
                      title="Удалить вариант"
                      aria-label="Удалить вариант"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              {formData.cardVariants.length < 5 && (
                <button
                  type="button"
                  className={styles.addAttrButton}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      cardVariants: [
                        ...prev.cardVariants,
                        {
                          name: '',
                          price: '',
                          image: '',
                          size: '',
                          color: '',
                          extraOption: '',
                          sortOrder: prev.cardVariants.length,
                        },
                      ],
                    }))
                  }
                >
                  + Добавить вариант (макс. 5)
                </button>
              )}
            </div>
          )}

          {/* SEO */}
          {showSection('seo') && (
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
                  Генерируется автоматически при изменении названия. Рекомендуемая длина: до 70
                  символов ({formData.seoTitle.length}/70)
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
                  Генерируется автоматически при изменении названия/цены. Рекомендуемая длина: до
                  160 символов ({formData.seoDescription.length}/160)
                </p>
              </div>
            </div>
          )}

          {/* Images */}
          {showSection('images') && (
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
          )}

          {/* Video */}
          {showSection('video') && (
            <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
              <h2 className={styles.sectionTitle}>Видеоролик о товаре</h2>
              <p className={styles.dropZoneHint}>
                Укажите ссылку на видео (YouTube, Vimeo или прямой URL на файл). На карточке товара
                будет отображаться кнопка просмотра.
              </p>
              <div className={styles.formGroup}>
                <label htmlFor="videoUrl" className={styles.label}>
                  URL видеоролика
                </label>
                <input
                  id="videoUrl"
                  name="videoUrl"
                  type="url"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="https://www.youtube.com/watch?v=... или https://..."
                />
              </div>
            </div>
          )}

          {/* Description */}
          {showSection('description') && (
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
          )}

          {/* Attributes / Characteristics */}
          {showSection('attributes') && (
            <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
              <h2 className={styles.sectionTitle}>Характеристики товара</h2>

              <div className={styles.attributesGrid}>
                {/* Category attributes */}
                <div className={styles.attributesSection}>
                  <h3 className={styles.attributesSubtitle}>Атрибуты категории</h3>
                  {fkCatalogError && (
                    <p className={styles.error} role="alert">
                      {fkCatalogError}
                      {fkCatalogShowPermissionHint ? (
                        <>
                          {' '}
                          Поля «Производитель», «Материал покрытия», «Тип полотна», «Толщина двери»
                          и «Уплотнители» не заполнятся без справочников. Если ответ сервера был
                          «доступ запрещён», проверьте роль и выдачу ресурсов в разделе доступа.
                        </>
                      ) : null}
                    </p>
                  )}
                  {categoryAttributes.length > 0 ? (
                    <div className={`${styles.attributesList} ${styles.attributesListTwoCol}`}>
                      {categoryAttributes.map((ca) => {
                        const slug = ca.attribute.slug;
                        const rawAttr = formData.attributes[slug];
                        const isManufacturerAttr = isManufacturerFkCategorySlug(slug);
                        const isCoatingMaterialAttr = isCoatingMaterialFkCategorySlug(slug);
                        const isCanvasTypeAttr = isCanvasTypeFkCategorySlug(slug);
                        const isDoorThicknessAttr = isDoorThicknessFkCategorySlug(slug);
                        const isWeatherstripAttr = isWeatherstripFkCategorySlug(slug);
                        /** Обязательность с учётом настроек категории и родителей (см. API getCategoryAttributes). */
                        const attrRequired = Boolean(ca.isRequired);
                        const attrValueFilled = isManufacturerAttr
                          ? Boolean(formData.manufacturerId?.trim())
                          : isCoatingMaterialAttr
                            ? Boolean(formData.coatingMaterialId?.trim())
                            : isCanvasTypeAttr
                              ? Boolean(formData.canvasTypeId?.trim())
                              : isDoorThicknessAttr
                                ? Boolean(formData.doorThicknessId?.trim())
                                : isWeatherstripAttr
                                  ? Boolean(formData.weatherstripId?.trim())
                                  : categoryAttributeValueFilled(ca.attribute.type, rawAttr);
                        const showClear = isManufacturerAttr
                          ? Boolean(formData.manufacturerId?.trim())
                          : isCoatingMaterialAttr
                            ? Boolean(formData.coatingMaterialId?.trim())
                            : isCanvasTypeAttr
                              ? Boolean(formData.canvasTypeId?.trim())
                              : isDoorThicknessAttr
                                ? Boolean(formData.doorThicknessId?.trim())
                                : isWeatherstripAttr
                                  ? Boolean(formData.weatherstripId?.trim())
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
                                    const mName =
                                      manufacturers.find((m) => m.id === id)?.name ?? '';
                                    setFormData((prev) => ({
                                      ...prev,
                                      manufacturerId: id,
                                      attributes: {
                                        ...prev.attributes,
                                        [slug]: mName,
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
                              ) : isCoatingMaterialAttr ? (
                                <select
                                  id={`attr-coating-material-${ca.id}`}
                                  value={formData.coatingMaterialId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const label =
                                      coatingMaterials.find((m) => m.id === id)?.name ?? '';
                                    setFormData((prev) => ({
                                      ...prev,
                                      coatingMaterialId: id,
                                      attributes: {
                                        ...prev.attributes,
                                        [slug]: label,
                                      },
                                    }));
                                  }}
                                  className={
                                    attrRequired
                                      ? `${styles.select} ${
                                          formData.coatingMaterialId?.trim()
                                            ? styles.fieldHighlightFilled
                                            : styles.fieldHighlightEmpty
                                        }`
                                      : styles.select
                                  }
                                >
                                  <option value="">Выберите значение</option>
                                  {coatingMaterials.map((m) => (
                                    <option key={m.id} value={m.id} disabled={!m.isActive}>
                                      {m.name}
                                      {!m.isActive ? ' (неактивен)' : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : isCanvasTypeAttr ? (
                                <select
                                  id={`attr-canvas-type-${ca.id}`}
                                  value={formData.canvasTypeId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const label = canvasTypes.find((m) => m.id === id)?.name ?? '';
                                    setFormData((prev) => ({
                                      ...prev,
                                      canvasTypeId: id,
                                      attributes: {
                                        ...prev.attributes,
                                        [slug]: label,
                                      },
                                    }));
                                  }}
                                  className={
                                    attrRequired
                                      ? `${styles.select} ${
                                          formData.canvasTypeId?.trim()
                                            ? styles.fieldHighlightFilled
                                            : styles.fieldHighlightEmpty
                                        }`
                                      : styles.select
                                  }
                                >
                                  <option value="">Выберите значение</option>
                                  {canvasTypes.map((m) => (
                                    <option key={m.id} value={m.id} disabled={!m.isActive}>
                                      {m.name}
                                      {!m.isActive ? ' (неактивен)' : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : isDoorThicknessAttr ? (
                                <select
                                  id={`attr-door-thickness-${ca.id}`}
                                  value={formData.doorThicknessId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const label =
                                      doorThicknesses.find((m) => m.id === id)?.name ?? '';
                                    setFormData((prev) => ({
                                      ...prev,
                                      doorThicknessId: id,
                                      attributes: {
                                        ...prev.attributes,
                                        [slug]: label,
                                      },
                                    }));
                                  }}
                                  className={
                                    attrRequired
                                      ? `${styles.select} ${
                                          formData.doorThicknessId?.trim()
                                            ? styles.fieldHighlightFilled
                                            : styles.fieldHighlightEmpty
                                        }`
                                      : styles.select
                                  }
                                >
                                  <option value="">Выберите значение</option>
                                  {doorThicknesses.map((m) => (
                                    <option key={m.id} value={m.id} disabled={!m.isActive}>
                                      {m.name}
                                      {!m.isActive ? ' (неактивен)' : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : isWeatherstripAttr ? (
                                <select
                                  id={`attr-weatherstrip-${ca.id}`}
                                  value={formData.weatherstripId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const label =
                                      weatherstrips.find((m) => m.id === id)?.name ?? '';
                                    setFormData((prev) => ({
                                      ...prev,
                                      weatherstripId: id,
                                      attributes: {
                                        ...prev.attributes,
                                        [slug]: label,
                                      },
                                    }));
                                  }}
                                  className={
                                    attrRequired
                                      ? `${styles.select} ${
                                          formData.weatherstripId?.trim()
                                            ? styles.fieldHighlightFilled
                                            : styles.fieldHighlightEmpty
                                        }`
                                      : styles.select
                                  }
                                >
                                  <option value="">Выберите значение</option>
                                  {weatherstrips.map((m) => (
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
                                      if (isManufacturerFkCategorySlug(slug)) {
                                        return {
                                          ...prev,
                                          manufacturerId: '',
                                          attributes: { ...prev.attributes, [slug]: '' },
                                        };
                                      }
                                      if (isCoatingMaterialFkCategorySlug(slug)) {
                                        return {
                                          ...prev,
                                          coatingMaterialId: '',
                                          attributes: {
                                            ...prev.attributes,
                                            [slug]: '',
                                          },
                                        };
                                      }
                                      if (isCanvasTypeFkCategorySlug(slug)) {
                                        return {
                                          ...prev,
                                          canvasTypeId: '',
                                          attributes: {
                                            ...prev.attributes,
                                            [slug]: '',
                                          },
                                        };
                                      }
                                      if (isDoorThicknessFkCategorySlug(slug)) {
                                        return {
                                          ...prev,
                                          doorThicknessId: '',
                                          attributes: {
                                            ...prev.attributes,
                                            [slug]: '',
                                          },
                                        };
                                      }
                                      if (isWeatherstripFkCategorySlug(slug)) {
                                        return {
                                          ...prev,
                                          weatherstripId: '',
                                          attributes: {
                                            ...prev.attributes,
                                            [slug]: '',
                                          },
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
                    <p className={styles.noAttributes}>Нет атрибутов для выбранной категории</p>
                  )}
                </div>

                {/* Custom attributes */}
                <div className={styles.attributesSection}>
                  <h3 className={styles.attributesSubtitle}>
                    Дополнительные характеристики
                    <span className={styles.customAttrHint}>(специфичные для этого товара)</span>
                  </h3>

                  {customAttributes.length > 0 && (
                    <div className={`${styles.attributesList} ${styles.attributesListTwoCol}`}>
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
          )}
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

      {/* Product Components Section */}
      {/* Вынесено за пределы основной формы, т.к. содержит свою форму */}
      {productId && showSection('components') && (
        <ProductComponentsSection
          productId={productId}
          categoryId={formData.categoryId}
          componentNamesHintCategoryId={interiorDoorsRootForHints?.id}
          componentNamesIncludeSubtree={!!interiorDoorsRootForHints}
        />
      )}

      {/* Product Reviews Section */}
      {productId && <ProductReviewsSection productId={productId} />}

      {/* Нижняя строка: слева "Назад к списку", справа "Отмена" и "Сохранить изменения" */}
      <div
        className={styles.formActions}
        style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--admin-border)',
        }}
      >
        <button
          type="button"
          className={styles.backButtonBottom}
          onClick={navigateBackToProductsList}
        >
          ← Назад к списку
        </button>
        <div className={styles.formActionsRight}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={navigateBackToProductsList}
          >
            Отмена
          </button>
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
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
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
