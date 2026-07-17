'use client';

import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';
import { AdminSaveButton, AdminStickySaveButtonSlot } from '@/views/admin/ui/AdminStickySaveButton';

import { ImageUrlModal } from '../shared/ImageUrlModal';
import componentStyles from '../shared/ProductComponentsSection.module.css';
import styles from '../shared/ProductEditPage.module.css';
import { ProductEditAttributesSection } from '../shared/sections/ProductEditAttributesSection';
import { ProductEditCardBadgesSection } from '../shared/sections/ProductEditCardBadgesSection';
import { ProductEditDescriptionSection } from '../shared/sections/ProductEditDescriptionSection';
import { ProductEditImagesSection } from '../shared/sections/ProductEditImagesSection';
import { ProductEditMainSection } from '../shared/sections/ProductEditMainSection';
import { ProductEditPricingSection } from '../shared/sections/ProductEditPricingSection';
import { ProductEditSeoSection } from '../shared/sections/ProductEditSeoSection';
import { ProductEditVariantsSection } from '../shared/sections/ProductEditVariantsSection';
import { ProductEditPageRoot } from '../shared/ui/ProductEditDynamicLayout';
import type { ProductCreatePageModel } from './useProductCreatePage';

type ProductCreatePageViewProps = {
  model: ProductCreatePageModel;
};

export function ProductCreatePageView({ model }: ProductCreatePageViewProps) {
  const {
    router,
    backUrl,
    isCopyMode,
    saving,
    formRef,
    pageHeaderRef,
    saveButtonState,
    saveButtonPinnedTopPx,
    handleHeaderSaveClick,
    submitProductForm,
    handleSubmit,
    formData,
    setFormData,
    parserLoading,
    parserInfo,
    parserBannerError,
    setParserInfo,
    setParserBannerError,
    reqHighlight,
    sizesRequired,
    partners,
    flatCategories,
    suppliers,
    fetchingPrice,
    setFetchingPrice,
    handleChange,
    handleSlugChange,
    handleSkuChange,
    handlePriceChange,
    handleIntegerChange,
    handleSupplierProductUrlBlur,
    clearSupplierProductUrl,
    setError,
    setSuccess,
    getAuthHeaders,
    badgeDefinitions,
    handleToggleCatalogBadge,
    suggestedSizes,
    suggestedAttributeValues,
    handleSeoTitleChange,
    handleSeoDescriptionChange,
    imageError,
    handleImageUpload,
    handleImageUrlAdd,
    removeImage,
    moveImage,
    fkCatalogError,
    fkCatalogShowPermissionHint,
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
    isInteriorDoorsCategorySelected,
    componentsDraftError,
    suggestedComponentNames,
    newComponentDraft,
    setNewComponentDraft,
    addDraftComponent,
    componentsToCopy,
    editingComponentIndex,
    editingComponentDraft,
    setEditingComponentDraft,
    saveEditDraftComponent,
    cancelEditDraftComponent,
    startEditDraftComponent,
    removeDraftComponent,
    imageUrlModalOpen,
    setImageUrlModalOpen,
    success,
    error,
  } = model;

  return (
    <ProductEditPageRoot stickyTopPx={saveButtonPinnedTopPx}>
      <div ref={pageHeaderRef} className={styles.pageHeader}>
        <div className={styles.pageHeaderMain}>
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
        <div className={styles.pageHeaderActions}>
          <AdminStickySaveButtonSlot
            state={saveButtonState}
            saving={saving}
            label="Создать товар"
            savingLabel="Создание..."
            onClick={handleHeaderSaveClick}
          />
        </div>
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
          <ProductEditMainSection
            formData={formData}
            reqHighlight={reqHighlight}
            partners={partners}
            flatCategories={flatCategories}
            suppliers={suppliers}
            nameCopyFlashKey={0}
            nameCopied={false}
            fetchingPrice={fetchingPrice}
            onCopyProductName={() => {}}
            onChange={handleChange}
            onSlugChange={handleSlugChange}
            onSkuChange={handleSkuChange}
            onPriceChange={handlePriceChange}
            onSupplierProductUrlBlur={handleSupplierProductUrlBlur}
            onClearSupplierProductUrl={clearSupplierProductUrl}
            onSupplierPriceFetched={(price, parser) => {
              setFormData((prev) => ({ ...prev, supplierPrice: price }));
              if (parser) {
                setParserInfo(parser);
                setParserBannerError(null);
              }
            }}
            onSyncPriceFromSupplier={() => {
              if (!formData.supplierPrice) {
                setError('Сначала укажите цену поставщика');
                return;
              }
              setFormData((prev) => ({ ...prev, price: prev.supplierPrice }));
              setSuccess('Цена товара обновлена на основе цены поставщика');
              setTimeout(() => setSuccess(null), 3000);
            }}
            onError={(message) => setError(message)}
            onSuccess={(message) => {
              setSuccess(message);
              setTimeout(() => setSuccess(null), 3000);
            }}
            onFetchingPriceChange={setFetchingPrice}
            getAuthHeaders={getAuthHeaders}
          />

          <ProductEditPricingSection
            formData={formData}
            onFormPatch={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
            reqHighlight={reqHighlight}
            handlePriceChange={handlePriceChange}
            handleIntegerChange={handleIntegerChange}
            handleChange={handleChange}
          />

          <ProductEditCardBadgesSection
            isFeatured={formData.isFeatured}
            isNew={formData.isNew}
            catalogBadgeIds={formData.catalogBadgeIds}
            badgeDefinitions={badgeDefinitions}
            onChange={handleChange}
            onToggleCatalogBadge={handleToggleCatalogBadge}
          />

          <ProductEditVariantsSection
            sizes={formData.sizes}
            openingSide={formData.openingSide}
            suggestedSizes={suggestedSizes}
            sizesHighlight={reqHighlight.sizes}
            sizesRequired={sizesRequired}
            onSizesChange={(sizes) => setFormData((prev) => ({ ...prev, sizes }))}
            onOpeningSideChange={(openingSide) => setFormData((prev) => ({ ...prev, openingSide }))}
          />

          <ProductEditSeoSection
            seoTitle={formData.seoTitle}
            seoDescription={formData.seoDescription}
            onSeoTitleChange={handleSeoTitleChange}
            onSeoDescriptionChange={handleSeoDescriptionChange}
          />

          <ProductEditImagesSection
            images={formData.images}
            imagesHighlight={reqHighlight.images}
            imageError={imageError}
            onImageUpload={handleImageUpload}
            onAddByUrl={handleImageUrlAdd}
            onRemoveImage={removeImage}
            onMoveImage={moveImage}
          />

          <ProductEditDescriptionSection
            description={formData.description}
            editorKey="new-product"
            onDescriptionChange={(value) =>
              setFormData((prev) => ({ ...prev, description: value }))
            }
          />

          <ProductEditAttributesSection
            fkCatalogError={fkCatalogError}
            fkCatalogShowPermissionHint={fkCatalogShowPermissionHint}
            categoryAttributes={categoryAttributes}
            suggestedAttributeValues={suggestedAttributeValues}
            formData={formData}
            setFormData={setFormData}
            manufacturers={manufacturers}
            coatingMaterials={coatingMaterials}
            canvasTypes={canvasTypes}
            doorThicknesses={doorThicknesses}
            weatherstrips={weatherstrips}
            customAttributes={customAttributes}
            setCustomAttributes={setCustomAttributes}
            newAttrKey={newAttrKey}
            setNewAttrKey={setNewAttrKey}
            newAttrValue={newAttrValue}
            setNewAttrValue={setNewAttrValue}
          />
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
            <div className={styles.draftComponentsGrid}>
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
            <div className={styles.draftComponentsActions}>
              <label className={componentStyles.inlineCheckbox}>
                <input
                  type="checkbox"
                  checked={newComponentDraft.isActive}
                  onChange={(e) =>
                    setNewComponentDraft((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                />
                Активно
              </label>
              <button
                data-admin-mutation
                type="button"
                className={styles.addAttrButton}
                onClick={addDraftComponent}
              >
                + Добавить комплектующее
              </button>
            </div>

            {componentsToCopy.length > 0 && (
              <div className={styles.draftComponentsList}>
                {componentsToCopy.map((component, index) => (
                  <div
                    key={`${component.name}-${component.type}-${index}`}
                    className={componentStyles.componentItem}
                  >
                    {editingComponentIndex === index ? (
                      <div className={componentStyles.componentInfo}>
                        <div className={componentStyles.editFormGrid}>
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
                            data-admin-mutation
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
                            <EditIcon size={16} tone="inherit" />
                          </button>
                          <button
                            data-admin-mutation
                            type="button"
                            className={componentStyles.deleteButton}
                            onClick={() => removeDraftComponent(index)}
                            title="Удалить комплектующее"
                          >
                            <DeleteIcon size={16} tone="inherit" />
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
            <AdminSaveButton
              saving={saving}
              label="Создать товар"
              savingLabel="Создание..."
              className={styles.footerSaveButton}
              onClick={(e) => {
                e.preventDefault();
                submitProductForm();
              }}
            />
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
      <div className={styles.pageFooter}>
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
    </ProductEditPageRoot>
  );
}
