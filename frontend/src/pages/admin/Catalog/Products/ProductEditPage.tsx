'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './ProductEditPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  categoryId: string;
  category: Category;
  manufacturerId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  images: string[];
  seoTitle: string | null;
  seoDescription: string | null;
}

interface ProductEditPageProps {
  productId: string;
}

export function ProductEditPage({ productId }: ProductEditPageProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productNotFound, setProductNotFound] = useState(false);

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
    isNew: false,
    seoTitle: '',
    seoDescription: '',
    images: [] as string[],
  });

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

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError('ID товара не указан');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setProductNotFound(false);

      try {
        console.log('Fetching product:', productId);
        const response = await fetch(`${API_URL}/products/${productId}`);

        if (response.status === 404) {
          setProductNotFound(true);
          throw new Error('Товар не найден');
        }

        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.status}`);
        }

        const product: Product = await response.json();
        console.log('Product loaded:', product);

        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          sku: product.sku || '',
          description: product.description || '',
          price: String(product.price || ''),
          comparePrice: product.comparePrice ? String(product.comparePrice) : '',
          stock: product.stock || 0,
          categoryId: product.categoryId || '',
          isActive: product.isActive ?? true,
          isFeatured: product.isFeatured ?? false,
          isNew: product.isNew ?? false,
          seoTitle: product.seoTitle || '',
          seoDescription: product.seoDescription || '',
          images: product.images || [],
        });
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/products/${productId}`, {
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
          categoryId: formData.categoryId,
          isActive: formData.isActive,
          isFeatured: formData.isFeatured,
          seoTitle: formData.seoTitle || null,
          seoDescription: formData.seoDescription || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка сохранения');
      }

      setSuccess('Товар успешно сохранён');
      setTimeout(() => setSuccess(null), 3000);
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
          <button
            className={styles.backButton}
            onClick={() => router.push('/admin/catalog/products')}
          >
            ← Вернуться к списку товаров
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/admin/catalog/products')}
        >
          ← Назад к списку
        </button>
        <h1 className={styles.title}>Редактирование товара</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

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
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="sku">Артикул (SKU)</label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Описание</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                className={styles.textarea}
              />
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
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="comparePrice">Старая цена</label>
                <input
                  type="number"
                  id="comparePrice"
                  name="comparePrice"
                  value={formData.comparePrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="stock">Остаток на складе</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                className={styles.input}
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
                <span>Рекомендуемый товар</span>
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
                onChange={handleChange}
                className={styles.input}
                placeholder="Оставьте пустым для использования названия товара"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="seoDescription">SEO описание</label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows={3}
                className={styles.textarea}
                placeholder="Краткое описание для поисковых систем"
              />
            </div>
          </div>

          {/* Images */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Изображения</h2>
            <div className={styles.imagesGrid}>
              {formData.images.length > 0 ? (
                formData.images.map((img, index) => (
                  <div key={index} className={styles.imageItem}>
                    <img src={img} alt={`Изображение ${index + 1}`} />
                  </div>
                ))
              ) : (
                <p className={styles.noImages}>Изображения не загружены</p>
              )}
            </div>
            <p className={styles.hint}>
              Для загрузки изображений используйте отдельную форму загрузки файлов.
            </p>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/admin/catalog/products')}
          >
            Отмена
          </button>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  );
}
