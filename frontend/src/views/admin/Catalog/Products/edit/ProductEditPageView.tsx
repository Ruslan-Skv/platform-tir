'use client';

import { createPortal } from 'react-dom';

import { CopyIcon } from '@/shared/ui/icons/CopyIcon';

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
import { ProductEditSaveButton } from '../shared/ui/ProductEditSaveButton';
import type { ProductEditPageModel } from './useProductEditPage';

type ProductEditPageViewProps = {
  model: ProductEditPageModel;
};

export function ProductEditPageView({ model }: ProductEditPageViewProps) {
  const {
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
  } = model;

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
    <div
      className={styles.page}
      style={{ '--product-edit-sticky-top': `${saveButtonPinnedTopPx}px` } as React.CSSProperties}
    >
      <div ref={pageHeaderRef} className={styles.pageHeader}>
        <div className={styles.pageHeaderMain}>
          <button className={styles.backButton} onClick={navigateBackToProductsList}>
            ← Назад к списку
          </button>
          <h1 className={styles.title}>Редактирование товара</h1>
        </div>
        <div className={styles.pageHeaderActions}>
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
          <div ref={saveButtonAnchorRef} className={styles.saveButtonAnchor}>
            {saveButtonFixed && saveButtonPlaceholderSize ? (
              <span
                className={styles.saveButtonPlaceholder}
                style={{
                  width: saveButtonPlaceholderSize.width,
                  height: saveButtonPlaceholderSize.height,
                }}
                aria-hidden
              />
            ) : null}
            {!saveButtonFixed ? (
              <ProductEditSaveButton
                buttonRef={saveButtonRef}
                saving={saving}
                fixed={false}
                fixedLeft={saveButtonFixedLeft}
                pinnedTopPx={saveButtonPinnedTopPx}
                onClick={handleHeaderSaveClick}
              />
            ) : null}
          </div>
        </div>
      </div>

      {saveButtonFixed && saveButtonPortalRoot
        ? createPortal(
            <ProductEditSaveButton
              buttonRef={saveButtonRef}
              saving={saving}
              fixed
              fixedLeft={saveButtonFixedLeft}
              pinnedTopPx={saveButtonPinnedTopPx}
              onClick={handleHeaderSaveClick}
            />,
            saveButtonPortalRoot
          )
        : null}

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
              onChange={handleChange}
            />
          )}

          {/* Attributes / Characteristics */}
          {showSection('attributes') && (
            <ProductEditAttributesSection
              fkCatalogError={fkCatalogError}
              fkCatalogShowPermissionHint={fkCatalogShowPermissionHint}
              categoryAttributes={categoryAttributes}
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
              submitProductForm();
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
