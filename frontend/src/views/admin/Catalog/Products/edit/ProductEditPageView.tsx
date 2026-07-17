'use client';

import { useCallback, useRef } from 'react';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { AdminSaveButton, AdminStickySaveButtonSlot } from '@/views/admin/ui/AdminStickySaveButton';

import { ImageUrlModal } from '../shared/ImageUrlModal';
import { ProductComponentsSection } from '../shared/ProductComponentsSection';
import styles from '../shared/ProductEditPage.module.css';
import { ProductReviewsSection } from '../shared/ProductReviewsSection';
import { ProductEditAttributesSection } from '../shared/sections/ProductEditAttributesSection';
import { ProductEditCardBadgesSection } from '../shared/sections/ProductEditCardBadgesSection';
import { ProductEditCardVariantsSection } from '../shared/sections/ProductEditCardVariantsSection';
import { ProductEditDescriptionSection } from '../shared/sections/ProductEditDescriptionSection';
import { ProductEditImagesSection } from '../shared/sections/ProductEditImagesSection';
import { ProductEditMainSection } from '../shared/sections/ProductEditMainSection';
import { ProductEditPricingSection } from '../shared/sections/ProductEditPricingSection';
import { ProductEditSeoSection } from '../shared/sections/ProductEditSeoSection';
import { ProductEditVariantsSection } from '../shared/sections/ProductEditVariantsSection';
import { ProductEditVideoSection } from '../shared/sections/ProductEditVideoSection';
import { ProductEditPageRoot } from '../shared/ui/ProductEditDynamicLayout';
import type { ProductEditPageModel } from './useProductEditPage';

type ProductEditPageViewProps = {
  model: ProductEditPageModel;
};

function ScrollChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === 'down' ? <path d="M6 9l6 6 6-6" /> : <path d="M18 15l-6-6-6 6" />}
    </svg>
  );
}

export function ProductEditPageView({ model }: ProductEditPageViewProps) {
  const {
    productId,
    navigateBackToProductsList,
    navigateToCopyProduct,
    leaveConfirmOpen,
    leaveSaving,
    cancelLeave,
    confirmLeaveWithoutSave,
    confirmLeaveWithSave,
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
    suggestedAttributeValues,
    parserInfo,
    setParserInfo,
    parserLoading,
    parserBannerError,
    setParserBannerError,
    formData,
    setFormData,
    reqHighlight,
    sizesRequired,
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
    saveButtonPinnedTopPx,
    handleHeaderSaveClick,
    submitProductForm,
    saveButtonState,
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
  } = model;

  const pageFooterRef = useRef<HTMLDivElement>(null);

  const scrollToCardBottom = useCallback(() => {
    pageFooterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const scrollToCardTop = useCallback(() => {
    pageHeaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pageHeaderRef]);

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
    <ProductEditPageRoot stickyTopPx={saveButtonPinnedTopPx}>
      <div ref={pageHeaderRef} className={styles.pageHeader}>
        <div className={styles.pageHeaderMain}>
          <button className={styles.backButton} onClick={navigateBackToProductsList}>
            ← Назад к списку
          </button>
          <h1 className={styles.title}>Редактирование товара</h1>
        </div>
        <div className={styles.pageHeaderActions}>
          <AdminTableIconButton
            type="button"
            className={styles.scrollNavIconButton}
            onClick={scrollToCardBottom}
            aria-label="Прокрутить карточку вниз"
            title="Вниз"
          >
            <ScrollChevronIcon direction="down" />
          </AdminTableIconButton>
          <button
            data-admin-mutation
            type="button"
            className={`${styles.cancelButton} ${styles.copyProductButton}`}
            onClick={navigateToCopyProduct}
            aria-label="Скопировать товар"
          >
            <CopyIcon />
            Скопировать
          </button>
          <AdminStickySaveButtonSlot
            state={saveButtonState}
            saving={saving}
            label="Сохранить изменения"
            onClick={handleHeaderSaveClick}
          />
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className={styles.form} noValidate>
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
            <ProductEditMainSection
              formData={formData}
              reqHighlight={reqHighlight}
              partners={partners}
              flatCategories={flatCategories}
              suppliers={suppliers}
              nameCopyFlashKey={nameCopyFlashKey}
              nameCopied={nameCopied}
              fetchingPrice={fetchingPrice}
              onCopyProductName={copyProductName}
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
          )}

          {showSection('pricing') && (
            <ProductEditPricingSection
              formData={formData}
              onFormPatch={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
              reqHighlight={reqHighlight}
              handlePriceChange={handlePriceChange}
              handleIntegerChange={handleIntegerChange}
              handleChange={handleChange}
            />
          )}

          {showSection('cardBadges') && (
            <ProductEditCardBadgesSection
              isFeatured={formData.isFeatured}
              isNew={formData.isNew}
              catalogBadgeIds={formData.catalogBadgeIds}
              badgeDefinitions={badgeDefinitions}
              onChange={handleChange}
              onToggleCatalogBadge={handleToggleCatalogBadge}
            />
          )}

          {showSection('variants') && (
            <ProductEditVariantsSection
              sizes={formData.sizes}
              openingSide={formData.openingSide}
              suggestedSizes={suggestedSizes}
              sizesHighlight={reqHighlight.sizes}
              sizesRequired={sizesRequired}
              onSizesChange={(sizes) => setFormData((prev) => ({ ...prev, sizes }))}
              onOpeningSideChange={(openingSide) =>
                setFormData((prev) => ({ ...prev, openingSide }))
              }
            />
          )}

          {showSection('cardVariants') && (
            <ProductEditCardVariantsSection
              cardVariants={formData.cardVariants}
              onCardVariantsChange={(cardVariants) =>
                setFormData((prev) => ({ ...prev, cardVariants }))
              }
              onVariantImageUpload={handleVariantImageUpload}
            />
          )}

          {showSection('seo') && (
            <ProductEditSeoSection
              seoTitle={formData.seoTitle}
              seoDescription={formData.seoDescription}
              onSeoTitleChange={handleSeoTitleChange}
              onSeoDescriptionChange={handleSeoDescriptionChange}
            />
          )}

          {showSection('images') && (
            <ProductEditImagesSection
              images={formData.images}
              imagesHighlight={reqHighlight.images}
              imageError={imageError}
              onImageUpload={handleImageUpload}
              onAddByUrl={handleImageUrlAdd}
              onRemoveImage={removeImage}
              onMoveImage={moveImage}
            />
          )}

          {showSection('video') && (
            <ProductEditVideoSection videoUrl={formData.videoUrl} onChange={handleChange} />
          )}

          {showSection('description') && (
            <ProductEditDescriptionSection
              description={formData.description}
              editorKey={productId}
              onDescriptionChange={(value) =>
                setFormData((prev) => ({ ...prev, description: value }))
              }
            />
          )}

          {/* Attributes / Characteristics */}
          {showSection('attributes') && (
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
      <div ref={pageFooterRef} className={`${styles.formActions} ${styles.formActionsFooter}`}>
        <div className={styles.formActionsLeft}>
          <button
            type="button"
            className={styles.scrollToTopButton}
            onClick={scrollToCardTop}
            aria-label="Прокрутить карточку наверх"
            title="Наверх"
          >
            <ScrollChevronIcon direction="up" />
            Наверх
          </button>
          <button
            type="button"
            className={styles.backButtonBottom}
            onClick={navigateBackToProductsList}
          >
            ← Назад к списку
          </button>
        </div>
        <div className={styles.formActionsRight}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={navigateBackToProductsList}
          >
            Отмена
          </button>
          <AdminSaveButton
            saving={saving}
            label="Сохранить изменения"
            className={styles.footerSaveButton}
            onClick={(e) => {
              e.preventDefault();
              submitProductForm();
            }}
          />
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

      <ConfirmModal
        isOpen={leaveConfirmOpen}
        title="Несохранённые изменения"
        message="В карточке есть несохранённые изменения. Сохранить их перед выходом?"
        confirmText="Сохранить"
        discardText="Не сохранять"
        cancelText="Отмена"
        onConfirm={() => {
          void confirmLeaveWithSave();
        }}
        onDiscard={confirmLeaveWithoutSave}
        onClose={cancelLeave}
        closeOnConfirm={false}
        confirmLoading={leaveSaving || saving}
      />
    </ProductEditPageRoot>
  );
}
