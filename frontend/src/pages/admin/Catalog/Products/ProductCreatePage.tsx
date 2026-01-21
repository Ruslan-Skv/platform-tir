'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './ProductEditPage.module.css';

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

export function ProductCreatePage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
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
    seoTitle: '',
    seoDescription: '',
    attributes: {} as Record<string, string>,
    images: [] as string[],
  });

  // Атрибуты категории и товара
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [customAttributes, setCustomAttributes] = useState<{ key: string; value: string }[]>([]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [autoSku, setAutoSku] = useState(true);
  const [autoSeoTitle, setAutoSeoTitle] = useState(true);
  const [autoSeoDescription, setAutoSeoDescription] = useState(true);

  // Загрузка изображений
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
        // При смене категории обновляем SEO
        setFormData((prev) => {
          const seoUpdates = updateSeoFields(prev.name, value, autoSeoTitle, autoSeoDescription);
          return { ...prev, categoryId: value, ...seoUpdates };
        });
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

  const handleImageUrlAdd = () => {
    const url = prompt('Введите URL изображения:');
    if (url && url.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, url.trim()],
      }));
    }
  };

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
    setSaving(true);
    setError(null);

    try {
      // Собираем все атрибуты в правильном порядке
      // Используем массив для сохранения порядка, затем конвертируем в объект
      const orderedAttributes: Array<{ key: string; value: string }> = [];

      // 1. Сначала атрибуты категории в порядке их определения
      // categoryAttributes уже отсортированы по order
      categoryAttributes.forEach((ca) => {
        const slug = ca.attribute.slug;
        const value = formData.attributes[slug];
        if (value) {
          orderedAttributes.push({
            key: ca.attribute.name,
            value: value,
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
      // Формат: [{name: "Модель", value: "..."}, {name: "Цвет", value: "..."}, ...]
      const attributesArray = orderedAttributes.map(({ key, value }) => ({
        name: key,
        value: value,
      }));

      // Validate categoryId before sending
      if (!formData.categoryId || formData.categoryId.trim() === '') {
        setError('Выберите категорию');
        setSaving(false);
        return;
      }

      console.log('Creating product with attributes (ordered array):', attributesArray);

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
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        attributes: attributesArray, // Массив с гарантированным порядком
        images: formData.images.length > 0 ? formData.images : undefined,
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
        throw new Error(data.message || 'Ошибка создания товара');
      }

      const createdProduct = await response.json();
      router.push(`/admin/catalog/products/${createdProduct.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания товара');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/admin/catalog/products')}
        >
          ← Назад к списку
        </button>
        <h1 className={styles.title}>Добавление товара</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Main Info */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Основная информация</h2>

            <div className={styles.formGroup}>
              <label htmlFor="name">Название *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Введите название товара"
              />
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

            <div className={styles.formGroup}>
              <label htmlFor="categoryId">Категория *</label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className={styles.select}
              >
                <option value="">Выберите категорию</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
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
                  className={styles.input}
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
              <label htmlFor="stock">Остаток на складе</label>
              <input
                type="text"
                inputMode="numeric"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleIntegerChange}
                className={styles.input}
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
          </div>

          {/* SEO */}
          <div className={styles.formSection}>
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
            <h2 className={styles.sectionTitle}>Изображения</h2>

            {imageError && <div className={styles.imageError}>{imageError}</div>}

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
                    {categoryAttributes.map((ca) => (
                      <div key={ca.id} className={styles.attributeRow}>
                        <label className={styles.attributeLabel}>
                          {ca.attribute.name}
                          {ca.isRequired && <span className={styles.required}>*</span>}
                          {ca.attribute.unit && (
                            <span className={styles.unit}>({ca.attribute.unit})</span>
                          )}
                        </label>
                        <div className={styles.attributeInput}>
                          {ca.attribute.type === 'BOOLEAN' ? (
                            <select
                              value={formData.attributes[ca.attribute.slug] || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  attributes: {
                                    ...prev.attributes,
                                    [ca.attribute.slug]: e.target.value,
                                  },
                                }))
                              }
                              className={styles.select}
                            >
                              <option value="">Не указано</option>
                              <option value="Да">Да</option>
                              <option value="Нет">Нет</option>
                            </select>
                          ) : ca.attribute.type === 'SELECT' ? (
                            <select
                              value={formData.attributes[ca.attribute.slug] || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  attributes: {
                                    ...prev.attributes,
                                    [ca.attribute.slug]: e.target.value,
                                  },
                                }))
                              }
                              className={styles.select}
                            >
                              <option value="">Выберите значение</option>
                              {ca.attribute.values.map((v) => (
                                <option key={v.id} value={v.value}>
                                  {v.value}
                                </option>
                              ))}
                            </select>
                          ) : ca.attribute.type === 'NUMBER' ? (
                            <input
                              type="number"
                              value={formData.attributes[ca.attribute.slug] || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  attributes: {
                                    ...prev.attributes,
                                    [ca.attribute.slug]: e.target.value,
                                  },
                                }))
                              }
                              className={styles.input}
                              step="any"
                            />
                          ) : (
                            <input
                              type="text"
                              value={formData.attributes[ca.attribute.slug] || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  attributes: {
                                    ...prev.attributes,
                                    [ca.attribute.slug]: e.target.value,
                                  },
                                }))
                              }
                              className={styles.input}
                            />
                          )}
                        </div>
                      </div>
                    ))}
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

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.backButtonBottom}
            onClick={() => router.push('/admin/catalog/products')}
          >
            ← Назад к списку
          </button>
          <div className={styles.formActionsRight}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => router.push('/admin/catalog/products')}
            >
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Создание...' : 'Создать товар'}
            </button>
          </div>
        </div>
      </form>

      {/* Toast notification for errors */}
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
