'use client';

import type { Dispatch, SetStateAction } from 'react';

import styles from '../ProductEditPage.module.css';
import {
  isCanvasTypeFkCategorySlug,
  isCoatingMaterialFkCategorySlug,
  isDoorThicknessFkCategorySlug,
  isManufacturerFkCategorySlug,
  isWeatherstripFkCategorySlug,
} from '../catalog-attribute-fk-slugs';
import {
  decodeMultiSelectStored,
  encodeMultiSelectValues,
  multiSelectHasSelection,
} from '../category-attribute-multiselect';
import { categoryAttributeValueFilled } from '../product-form-required-fields';
import type {
  CatalogFkOption,
  ProductAttributesFormSlice,
  ProductCategoryAttribute,
  ProductCustomAttribute,
} from '../product-form-types';

type ProductEditAttributesSectionProps<T extends ProductAttributesFormSlice> = {
  fkCatalogError: string | null;
  fkCatalogShowPermissionHint: boolean;
  categoryAttributes: ProductCategoryAttribute[];
  formData: T;
  setFormData: Dispatch<SetStateAction<T>>;
  manufacturers: CatalogFkOption[];
  coatingMaterials: CatalogFkOption[];
  canvasTypes: CatalogFkOption[];
  doorThicknesses: CatalogFkOption[];
  weatherstrips: CatalogFkOption[];
  customAttributes: ProductCustomAttribute[];
  setCustomAttributes: Dispatch<SetStateAction<ProductCustomAttribute[]>>;
  newAttrKey: string;
  setNewAttrKey: Dispatch<SetStateAction<string>>;
  newAttrValue: string;
  setNewAttrValue: Dispatch<SetStateAction<string>>;
};

export function ProductEditAttributesSection<T extends ProductAttributesFormSlice>({
  fkCatalogError,
  fkCatalogShowPermissionHint,
  categoryAttributes,
  formData,
  setFormData,
  manufacturers,
  coatingMaterials,
  canvasTypes,
  doorThicknesses,
  weatherstrips,
  customAttributes,
  setCustomAttributes,
  newAttrKey,
  setNewAttrKey,
  newAttrValue,
  setNewAttrValue,
}: ProductEditAttributesSectionProps<T>) {
  return (
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
                  Поля «Производитель», «Материал покрытия», «Тип полотна», «Толщина двери» и
                  «Уплотнители» не заполнятся без справочников. Если ответ сервера был «доступ
                  запрещён», проверьте роль и выдачу ресурсов в разделе доступа.
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
                            const mName = manufacturers.find((m) => m.id === id)?.name ?? '';
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
                            const label = coatingMaterials.find((m) => m.id === id)?.name ?? '';
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
                            const label = doorThicknesses.find((m) => m.id === id)?.name ?? '';
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
                            const label = weatherstrips.find((m) => m.id === id)?.name ?? '';
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
                              Нет вариантов списка — задайте их в настройках категории (Каталог →
                              Категории).
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
                    data-admin-mutation
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
  );
}
