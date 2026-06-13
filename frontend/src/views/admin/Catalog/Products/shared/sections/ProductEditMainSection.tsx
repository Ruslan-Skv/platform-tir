'use client';

import type { ChangeEvent } from 'react';

import { getApiErrorMessage } from '@/shared/lib/api-error';
import { apiFetch } from '@/shared/lib/api-fetch';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';

import styles from '../ProductEditPage.module.css';
import { PRODUCT_FORM_API_URL } from '../product-form-constants';
import { adminProductFieldHighlightClass } from '../product-form-required-fields';

type FlatCategory = { id: string; name: string };

type ProductEditMainFormData = {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  partnerId: string;
  supplierId: string;
  supplierSku: string;
  supplierProductUrl: string;
  supplierPrice: string;
  price: string;
};

type ReqHighlight = {
  name: boolean;
  category: boolean;
  supplier: boolean;
  supplierUrl: boolean;
  supplierSku: boolean;
};

type ParserInfo = { key: string; title: string };

type ProductEditMainSectionProps = {
  formData: ProductEditMainFormData;
  reqHighlight: ReqHighlight;
  partners: Array<{ id: string; name: string }>;
  flatCategories: FlatCategory[];
  suppliers: Array<{ id: string; legalName: string; commercialName?: string | null }>;
  nameCopyFlashKey: number;
  nameCopied: boolean;
  fetchingPrice: boolean;
  onCopyProductName: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSlugChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSkuChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPriceChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSupplierProductUrlBlur: () => void;
  onClearSupplierProductUrl: () => void;
  onSupplierPriceFetched: (price: string, parser: ParserInfo | null) => void;
  onSyncPriceFromSupplier: () => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string) => void;
  onFetchingPriceChange: (fetching: boolean) => void;
  getAuthHeaders: () => HeadersInit;
};

export function ProductEditMainSection({
  formData,
  reqHighlight,
  partners,
  flatCategories,
  suppliers,
  nameCopyFlashKey,
  nameCopied,
  fetchingPrice,
  onCopyProductName,
  onChange,
  onSlugChange,
  onSkuChange,
  onPriceChange,
  onSupplierProductUrlBlur,
  onClearSupplierProductUrl,
  onSupplierPriceFetched,
  onSyncPriceFromSupplier,
  onError,
  onSuccess,
  onFetchingPriceChange,
  getAuthHeaders,
}: ProductEditMainSectionProps) {
  const handleFetchSupplierPrice = async () => {
    if (!formData.supplierProductUrl) {
      onError('Введите ссылку на товар поставщика');
      return;
    }
    try {
      onFetchingPriceChange(true);
      onError(null);
      const response = await apiFetch(
        `${PRODUCT_FORM_API_URL}/products/scrape/price?url=${encodeURIComponent(formData.supplierProductUrl)}&supplierId=${encodeURIComponent(formData.supplierId || '')}&categoryId=${encodeURIComponent(formData.categoryId || '')}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(data, 'Ошибка получения цены'));
      }
      const data = await response.json();
      const parser =
        data?.parser && typeof data.parser === 'object' && typeof data.parser.title === 'string'
          ? {
              key: typeof data.parser.key === 'string' ? data.parser.key : '',
              title: data.parser.title,
            }
          : null;
      onSupplierPriceFetched(String(data.price), parser);
      const parserTitle = parser ? ` (${parser.title})` : '';
      onSuccess(`Цена получена: ${data.price} ₽${parserTitle}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Ошибка получения цены');
    } finally {
      onFetchingPriceChange(false);
    }
  };

  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>Основная информация</h2>

      <div className={`${styles.formRow} ${styles.namePartnerRow}`}>
        <div className={`${styles.formGroup} ${styles.nameGroup}`}>
          <label htmlFor="name">Название *</label>
          <div className={styles.inputWithAction}>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              className={`${styles.input} ${styles.inputWithActionField} ${adminProductFieldHighlightClass(reqHighlight.name, styles)}`}
            />
            <AdminTableIconButton
              key={nameCopyFlashKey}
              type="button"
              className={`${styles.inputWithActionButton} ${
                nameCopyFlashKey > 0 ? styles.copyNameButtonFlash : ''
              }`}
              onClick={() => void onCopyProductName()}
              disabled={!formData.name.trim()}
              title={nameCopied ? 'Скопировано' : 'Скопировать название'}
              aria-label={nameCopied ? 'Название скопировано' : 'Скопировать название товара'}
            >
              <CopyIcon />
            </AdminTableIconButton>
          </div>
        </div>
        <div className={`${styles.formGroup} ${styles.partnerGroup}`}>
          <label htmlFor="partnerId">Партнёр</label>
          <select
            id="partnerId"
            name="partnerId"
            value={formData.partnerId}
            onChange={onChange}
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
            onChange={onSlugChange}
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
            onChange={onSkuChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
        <div className={`${styles.formRow} ${styles.supplierUrlPriceRow}`}>
          <div className={`${styles.formGroup} ${styles.supplierUrlGroup}`}>
            <label htmlFor="supplierProductUrl">Ссылка на товар поставщика *</label>
            <div className={styles.supplierUrlActions}>
              <div className={`${styles.inputWithAction} ${styles.inputWithActionGrow}`}>
                <input
                  type="url"
                  id="supplierProductUrl"
                  name="supplierProductUrl"
                  value={formData.supplierProductUrl}
                  onChange={onChange}
                  onBlur={onSupplierProductUrlBlur}
                  required
                  className={`${styles.input} ${styles.inputWithActionField} ${adminProductFieldHighlightClass(reqHighlight.supplierUrl, styles)}`}
                  placeholder="https://supplier.com/product/123"
                />
                <AdminTableIconButton
                  type="button"
                  className={styles.inputWithActionButton}
                  onClick={onClearSupplierProductUrl}
                  disabled={!formData.supplierProductUrl.trim()}
                  title="Очистить ссылку"
                  aria-label="Очистить ссылку на товар поставщика"
                >
                  ✕
                </AdminTableIconButton>
              </div>
              <button
                type="button"
                onClick={() => void handleFetchSupplierPrice()}
                disabled={fetchingPrice || !formData.supplierProductUrl}
                className={`${styles.button} ${styles.fetchPriceButton}`}
              >
                {fetchingPrice ? 'Загрузка...' : 'Получить цену'}
              </button>
            </div>
            <p className={styles.hint}>
              Какой парсер будет использован, показывается после ухода с поля ссылки или при смене
              поставщика/категории. Цену по ссылке получайте только по кнопке «Получить цену».
            </p>
          </div>
          <div className={`${styles.formGroup} ${styles.supplierPriceGroup}`}>
            <label htmlFor="supplierPrice">Цена поставщика</label>
            <div className={styles.supplierPriceControls}>
              <input
                type="text"
                inputMode="decimal"
                id="supplierPrice"
                name="supplierPrice"
                value={formData.supplierPrice}
                onChange={onPriceChange}
                className={styles.input}
                placeholder="0.00"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={onSyncPriceFromSupplier}
                disabled={!formData.supplierPrice}
                className={`${styles.button} ${styles.supplierPriceSyncButton}`}
                title="Синхронизировать цену товара с ценой поставщика"
              >
                Синхронизировать
              </button>
            </div>
            <p className={styles.hint}>Цена товара у поставщика.</p>
          </div>
        </div>
      )}
    </div>
  );
}
